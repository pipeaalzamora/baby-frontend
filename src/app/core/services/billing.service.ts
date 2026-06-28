import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface BillingFeatures {
  aiAssistantUnlimited: boolean;
  pdfExport: boolean;
  growthCurves: boolean;
}

export interface BillingStatus {
  premium: boolean;
  plan: string;
  expiresAt?: string;
  priceClp: number;
  days: number;
  aiDailyFreeLimit: number;
  features: BillingFeatures;
}

export interface CheckoutResponse {
  redirectUrl: string;
  token: string;
  amountClp: number;
}

/**
 * Servicio de facturación / premium. Expone el estado premium como signal para
 * que cualquier parte de la app (shell, gating de PDF, asistente) lo reutilice
 * sin volver a pedirlo al backend. El interceptor de auth añade el token.
 */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/billing`;

  private _state = signal<BillingStatus | null>(null);

  /** Estado completo de facturación (precio, features, vencimiento, etc.). */
  readonly state = this._state.asReadonly();
  /** Atajo reactivo: ¿el usuario es premium? */
  readonly premium = computed(() => this._state()?.premium ?? false);

  /** GET /api/billing/status — refresca el estado premium y lo guarda en el signal. */
  status() {
    return this.http
      .get<BillingStatus>(`${this.base}/status`)
      .pipe(tap((s) => this._state.set(s)));
  }

  /**
   * POST /api/billing/checkout — inicia el pago y navega el navegador a la
   * página del backend que auto-redirige a Webpay. Tras pagar, el backend
   * vuelve a `${FRONTEND}/billing/result?status=...`.
   */
  checkout() {
    return this.http
      .post<CheckoutResponse>(`${this.base}/checkout`, {})
      .pipe(
        tap((res) => {
          if (res?.redirectUrl) {
            window.location.href = res.redirectUrl;
          }
        }),
      );
  }
}
