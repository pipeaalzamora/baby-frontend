import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, from } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../models/models';
import { FirebaseService } from './firebase.service';

const TOKEN_KEY = 'baby_token';
const USER_KEY = 'baby_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private firebase = inject(FirebaseService);

  private _user = signal<AuthUser | null>(this.loadUser());
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());

  loginWithGoogle() {
    return from(this.firebase.signInWithGoogle()).pipe(
      switchMap((firebaseUser) => from(firebaseUser.getIdToken())),
      tap((token) => this.saveToken(token)),
      switchMap(() => this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`)),
      tap((user) => this.saveUser(user)),
    );
  }

  logout() {
    this.clearSession();
    void this.firebase.signOut();
    this.router.navigate(['/login']);
  }

  async getFreshToken(): Promise<string | null> {
    const token = await this.firebase.getIdToken();
    if (token) {
      this.saveToken(token);
      return token;
    }
    return null;
  }

  async restoreSession(): Promise<boolean> {
    const token = await this.getFreshToken();
    if (!token) {
      this.clearSession();
      return false;
    }

    if (!this._user()) {
      try {
        const user = await firstValueFrom(this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`));
        this.saveUser(user);
      } catch {
        this.clearSession();
        return false;
      }
    }

    return true;
  }

  updateChildId(childId: string) {
    const user = this._user();
    if (user) {
      const updated = { ...user, childId };
      this._user.set(updated);
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
  }

  private saveToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    this._token.set(token);
  }

  private saveUser(user: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this._user.set(user);
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
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
