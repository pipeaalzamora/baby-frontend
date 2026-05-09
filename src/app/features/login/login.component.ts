import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  NgZone,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private zone = inject(NgZone);

  error = signal<string | null>(null);
  loading = signal(false);

  ngOnInit() {
    // If already logged in, redirect
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.loadGoogleScript();
  }

  ngOnDestroy() {
    // Clean up GIS script if needed
  }

  private loadGoogleScript() {
    if (typeof google !== 'undefined' && google.accounts) {
      this.initGoogleSignIn();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => this.initGoogleSignIn();
    script.onerror = () => {
      this.error.set('No se pudo cargar Google Sign-In. Verifica tu conexión.');
    };
    document.head.appendChild(script);
  }

  private initGoogleSignIn() {
    try {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleCredential(response),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        {
          theme: 'outline',
          size: 'large',
          width: 280,
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        }
      );
    } catch (e) {
      this.error.set('Error al inicializar Google Sign-In.');
    }
  }

  private handleCredential(response: { credential: string }) {
    this.zone.run(() => {
      this.loading.set(true);
      this.error.set(null);

      this.auth.loginWithGoogle(response.credential).subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.error?.error ?? 'Error al iniciar sesión. Intenta de nuevo.';
          this.error.set(msg);
        },
      });
    });
  }
}
