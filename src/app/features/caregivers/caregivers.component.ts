import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CaregiverService } from '../../core/services/caregiver.service';
import { ToastService } from '../../core/services/toast.service';
import { Caregiver, CaregiverRole, SharedChild } from '../../core/models/models';

interface InviteForm {
  email: string;
  name: string;
  role: CaregiverRole;
}

@Component({
  selector: 'app-caregivers',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './caregivers.component.html',
  styleUrls: ['./caregivers.component.scss'],
})
export class CaregiversComponent implements OnInit {
  private svc   = inject(CaregiverService);
  private toast = inject(ToastService);

  caregivers = signal<Caregiver[]>([]);
  shared     = signal<SharedChild[]>([]);
  loading    = signal(true);
  inviting   = signal(false);
  error      = signal<string | null>(null);

  /** Enlace generado tras la última invitación (para copiar). */
  lastInviteLink = signal<string | null>(null);

  showForm = signal(false);

  form: InviteForm = { email: '', name: '', role: 'viewer' };

  readonly roles: { value: CaregiverRole; label: string }[] = [
    { value: 'parent',    label: 'Padre / Madre' },
    { value: 'caregiver', label: 'Cuidador/a' },
    { value: 'doctor',    label: 'Médico/a (solo lectura)' },
    { value: 'viewer',    label: 'Observador (solo lectura)' },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (list) => { this.caregivers.set(list); this.loading.set(false); },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Error al cargar cuidadores.');
        this.loading.set(false);
      },
    });
    this.svc.shared().subscribe({
      next: (list) => this.shared.set(list),
      error: () => undefined,
    });
  }

  roleLabel(role: CaregiverRole): string {
    return this.roles.find((r) => r.value === role)?.label ?? role;
  }

  isReadOnly(role: CaregiverRole): boolean {
    return role === 'viewer' || role === 'doctor';
  }

  toggleForm() {
    this.showForm.update((v) => !v);
    this.error.set(null);
  }

  submitInvite() {
    const email = this.form.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error.set('Ingresa un email válido.');
      return;
    }

    this.inviting.set(true);
    this.error.set(null);

    this.svc.invite(email, this.form.name.trim() || undefined, this.form.role).subscribe({
      next: (res) => {
        this.inviting.set(false);
        this.caregivers.update((list) => [...list, res.caregiver]);
        this.lastInviteLink.set(this.absoluteLink(res.inviteLink));
        this.toast.success('Invitación creada. Comparte el enlace.');
        this.form = { email: '', name: '', role: 'viewer' };
        this.showForm.set(false);
      },
      error: (err) => {
        this.inviting.set(false);
        this.error.set(err?.error?.error ?? 'No se pudo crear la invitación.');
      },
    });
  }

  copyLink() {
    const link = this.lastInviteLink();
    if (!link) return;
    navigator.clipboard?.writeText(link).then(
      () => this.toast.success('Enlace copiado al portapapeles.'),
      () => this.toast.error('No se pudo copiar el enlace.'),
    );
  }

  dismissLink() { this.lastInviteLink.set(null); }

  remove(c: Caregiver) {
    if (!confirm(`¿Quitar acceso a ${c.name || c.email}?`)) return;
    this.svc.remove(c.id).subscribe({
      next: () => {
        this.caregivers.update((list) => list.filter((x) => x.id !== c.id));
        this.toast.success('Acceso revocado.');
      },
      error: (err) => this.toast.error(err?.error?.error ?? 'No se pudo revocar el acceso.'),
    });
  }

  selectShared(child: SharedChild) {
    this.svc.selectChild(child.id).subscribe({
      next: () => {
        this.toast.success(`Perfil de ${child.name} seleccionado.`);
        window.location.assign('/dashboard');
      },
      error: (err) => this.toast.error(err?.error?.error ?? 'No se pudo seleccionar el perfil.'),
    });
  }

  private absoluteLink(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  }
}
