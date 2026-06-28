import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ChildService } from '../../core/services/child.service';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { PushService } from '../../core/services/push.service';
import { BillingService } from '../../core/services/billing.service';
import { Child } from '../../core/models/models';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  childSvc = inject(ChildService);
  theme = inject(ThemeService);
  toast = inject(ToastService);
  billing = inject(BillingService);
  private push = inject(PushService);
  sidebarOpen = signal(false);

  ngOnInit() {
    this.childSvc.list().subscribe({ error: () => undefined });
    // Estado premium para insignias y gating en toda la app.
    this.billing.status().subscribe({ error: () => undefined });
    // Usuario autenticado (el shell solo carga tras authGuard): registramos push.
    void this.push.register();
  }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar()  { this.sidebarOpen.set(false); }
  logout()        {
    void this.push.unregister();
    this.auth.logout();
  }

  selectActiveChild(event: Event) {
    const id = (event.target as HTMLSelectElement).value;
    if (!id || id === this.childSvc.activeChild()?.id) return;

    this.childSvc.select(id).subscribe({
      next: () => {
        this.closeSidebar();
        window.location.assign('/dashboard');
      },
    });
  }

  ageFor(child: Child | null): string {
    if (!child?.birthDate) return '';

    const birth = new Date(child.birthDate + 'T00:00:00');
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) months -= 1;
    if (months < 1) return 'Recién nacido';
    if (months < 24) return `${months} ${months === 1 ? 'mes' : 'meses'}`;

    const years = Math.floor(months / 12);
    const rest = months % 12;
    return rest > 0 ? `${years} años y ${rest} meses` : `${years} años`;
  }

  readonly navItems = [
    { path: '/dashboard',   label: 'Dashboard',         icon: 'home',        color: '#0ea5e9' },
    { path: '/profile',     label: 'Perfil',            icon: 'profile',     color: '#14b8a6' },
    { path: '/vaccines',    label: 'Vacunas',            icon: 'shield',      color: '#38bdf8' },
    { path: '/growth',      label: 'Crecimiento',        icon: 'chart',       color: '#7dd3fc' },
    { path: '/checkups',    label: 'Controles Médicos',  icon: 'stethoscope', color: '#0ea5e9' },
    { path: '/nutrition',   label: 'Alimentación',       icon: 'nutrition',   color: '#10b981' },
    { path: '/medications', label: 'Medicamentos',       icon: 'pill',        color: '#10b981' },
    { path: '/milestones',  label: 'Hitos',              icon: 'star',        color: '#f59e0b' },
    { path: '/photos',      label: 'Fotos',              icon: 'camera',      color: '#6366f1' },
    { path: '/diary',       label: 'Diario',             icon: 'diary',       color: '#8b5cf6' },
    { path: '/explore',     label: 'Descubre',           icon: 'compass',     color: '#0ea5e9' },
    { path: '/caregivers',  label: 'Cuidadores',         icon: 'users',       color: '#14b8a6' },
    { path: '/assistant',   label: 'Asistente IA',       icon: 'chat',        color: '#8b5cf6' },
    { path: '/premium',     label: 'Premium',            icon: 'crown',       color: '#f59e0b' },
  ];
}
