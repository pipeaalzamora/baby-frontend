import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FirebaseService } from './firebase.service';
import { ToastService } from './toast.service';

/**
 * Gestiona el push web con Firebase Cloud Messaging:
 * pide permiso, obtiene el token FCM, lo registra en el backend y
 * escucha mensajes en foreground.
 *
 * Degrada con gracia: si no hay soporte del navegador o `vapidKey` está
 * vacío, omite el registro sin romper la app.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private http = inject(HttpClient);
  private firebase = inject(FirebaseService);
  private toast = inject(ToastService);

  private messaging: Messaging | null = null;
  private currentToken: string | null = null;
  private registered = false;

  /**
   * Registra el dispositivo para notificaciones push. Llamar tras el login
   * cuando ya hay un usuario autenticado. Es idempotente.
   */
  async register(): Promise<void> {
    if (this.registered) return;

    if (!environment.vapidKey) {
      console.warn('[Push] vapidKey vacía: se omite el registro de notificaciones push.');
      return;
    }

    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[Push] El navegador no soporta notificaciones push.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[Push] Permiso de notificaciones no concedido.');
        return;
      }

      const swRegistration = await navigator.serviceWorker.register(
        'firebase-messaging-sw.js',
      );

      this.messaging = getMessaging(this.firebase.getApp());

      const token = await getToken(this.messaging, {
        vapidKey: environment.vapidKey,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) {
        console.warn('[Push] No se pudo obtener el token FCM.');
        return;
      }

      this.currentToken = token;
      await firstValueFrom(
        this.http.post<{ ok: boolean }>(`${environment.apiUrl}/notifications/device`, {
          token,
          platform: 'web',
        }),
      );

      this.listenForeground();
      this.registered = true;
    } catch (err) {
      console.warn('[Push] No se pudo registrar el dispositivo para push.', err);
    }
  }

  /**
   * Elimina el registro del dispositivo en el backend (p. ej. al cerrar sesión).
   */
  async unregister(): Promise<void> {
    if (!this.currentToken) return;
    try {
      await firstValueFrom(
        this.http.delete<{ ok: boolean }>(
          `${environment.apiUrl}/notifications/device/${this.currentToken}`,
        ),
      );
    } catch (err) {
      console.warn('[Push] No se pudo eliminar el dispositivo.', err);
    } finally {
      this.currentToken = null;
      this.registered = false;
    }
  }

  /** Muestra los mensajes recibidos mientras la app está en primer plano. */
  private listenForeground(): void {
    if (!this.messaging) return;
    onMessage(this.messaging, (payload) => {
      const title = payload.notification?.title;
      const body = payload.notification?.body;
      const message = [title, body].filter(Boolean).join(' — ');
      if (message) {
        this.toast.info(message);
      }
    });
  }
}
