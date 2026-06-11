import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';
import {
  Auth,
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app: FirebaseApp;
  private auth: Auth;
  private analytics: Analytics | null = null;
  private googleProvider = new GoogleAuthProvider();

  constructor() {
    this.app = initializeApp(environment.firebaseConfig);
    this.auth = getAuth(this.app);
    this.googleProvider.setCustomParameters({ prompt: 'select_account' });

    // Analytics solo en producción y solo en el browser (no SSR)
    if (environment.production && typeof window !== 'undefined') {
      try {
        this.analytics = getAnalytics(this.app);
      } catch {
        // Analytics puede fallar en entornos sin cookies habilitadas
      }
    }
  }

  signInWithGoogle(): Promise<User> {
    return signInWithPopup(this.auth, this.googleProvider).then((credential) => credential.user);
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }

  async getIdToken(forceRefresh = false): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user ? user.getIdToken(forceRefresh) : null;
  }

  private getCurrentUser(): Promise<User | null> {
    if (this.auth.currentUser) {
      return Promise.resolve(this.auth.currentUser);
    }

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(
        this.auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        () => {
          unsubscribe();
          resolve(null);
        },
      );
    });
  }

  /** Registra un evento de Analytics (solo en producción) */
  logEvent(name: string, params?: Record<string, unknown>) {
    if (this.analytics) {
      logEvent(this.analytics, name, params);
    }
  }
}
