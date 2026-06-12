import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  error = signal<string | null>(null);
  loading = signal(false);

  ngOnInit() {
    void this.auth.restoreSession().then((isLoggedIn) => {
      if (isLoggedIn) this.router.navigate(['/dashboard']);
    });
  }

  login() {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.auth.loginWithGoogle().subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.error ?? 'Error al iniciar sesión con Firebase. Intenta de nuevo.';
        this.error.set(msg);
      },
    });
  }
}
