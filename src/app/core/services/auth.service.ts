import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthUser, AuthResponse } from '../models/models';

const TOKEN_KEY = 'baby_token';
const USER_KEY = 'baby_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<AuthUser | null>(this.loadUser());
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());

  /** Sends the Google credential (ID token) to our backend for verification */
  loginWithGoogle(credential: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/google`, { credential })
      .pipe(
        tap((res) => {
          this.saveSession(res.token, res.user);
        })
      );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this._token();
  }

  updateChildId(childId: string) {
    const user = this._user();
    if (user) {
      const updated = { ...user, childId };
      this._user.set(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
  }

  private saveSession(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._token.set(token);
    this._user.set(user);
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
