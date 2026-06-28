import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CaregiverService } from '../../core/services/caregiver.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-invite',
  standalone: true,
  imports: [],
  templateUrl: './invite.component.html',
  styleUrls: ['./invite.component.scss'],
})
export class InviteComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(CaregiverService);
  private toast = inject(ToastService);

  state = signal<'loading' | 'ok' | 'error'>('loading');
  message = signal<string>('Aceptando invitación...');

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.state.set('error');
      this.message.set('Enlace de invitación inválido.');
      return;
    }

    this.svc.accept(token).subscribe({
      next: (res) => {
        this.state.set('ok');
        this.message.set('¡Invitación aceptada! Ahora tienes acceso a este perfil.');
        this.toast.success('Invitación aceptada correctamente.');
        // Seleccionamos el perfil compartido y vamos al dashboard
        this.svc.selectChild(res.childId).subscribe({
          next: () => setTimeout(() => this.router.navigate(['/dashboard']), 1500),
          error: () => setTimeout(() => this.router.navigate(['/dashboard']), 1500),
        });
      },
      error: (err) => {
        this.state.set('error');
        this.message.set(err?.error?.error ?? 'No se pudo aceptar la invitación. El enlace puede haber expirado.');
      },
    });
  }

  goDashboard() { this.router.navigate(['/dashboard']); }
}
