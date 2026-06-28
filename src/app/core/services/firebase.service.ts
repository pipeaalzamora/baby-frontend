import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
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
  private googleProvider = new GoogleAuthProvider();

  constructor() {
    this.app = initializeApp(environment.firebaseConfig);
    this.auth = getAuth(this.app);
    this.googleProvider.setCustomParameters({ prompt: 'select_account' });
  }

  signInWithGoogle(): Promise<User> {
    return signInWithPopup(this.auth, this.googleProvider).then((credential) => credential.user);
  }

  /** Expone la FirebaseApp inicializada para reutilizarla (p. ej. Messaging). */
  getApp(): FirebaseApp {
    return this.app;
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

  logEvent(_name: string, _params?: Record<string, unknown>) {}
}
