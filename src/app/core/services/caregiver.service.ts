import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AcceptInviteResult,
  Caregiver,
  CaregiverInvite,
  CaregiverRole,
  Child,
  SharedChild,
} from '../models/models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CaregiverService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private base = `${environment.apiUrl}/caregivers`;
  private childrenBase = `${environment.apiUrl}/children`;

  /** Cuidadores del perfil ACTIVO. */
  list() {
    return this.http.get<Caregiver[]>(this.base);
  }

  /** Invita a un cuidador y devuelve el enlace de invitación. */
  invite(email: string, name?: string, role: CaregiverRole = 'viewer') {
    return this.http.post<CaregiverInvite>(this.base, { email, name, role });
  }

  remove(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }

  /** Acepta una invitación a partir del token (requiere estar autenticado). */
  accept(token: string) {
    return this.http.get<AcceptInviteResult>(`${this.base}/accept/${token}`);
  }

  /** Perfiles que otros compartieron conmigo. */
  shared() {
    return this.http.get<SharedChild[]>(`${this.childrenBase}/shared`);
  }

  /** Selecciona un perfil (propio o compartido) como activo. */
  selectChild(id: string) {
    return this.http.post<Child>(`${this.childrenBase}/${id}/select`, {}).pipe(
      tap((child) => this.auth.updateChildId(child.id)),
    );
  }
}
