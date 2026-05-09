import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  sidebarOpen = signal(false);

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar()  { this.sidebarOpen.set(false); }
  logout()        { this.auth.logout(); }

  readonly navItems = [
    { path: '/dashboard', label: 'Dashboard',   icon: 'home',    color: '#0ea5e9' },
    { path: '/vaccines',  label: 'Vacunas',      icon: 'shield',  color: '#38bdf8' },
    { path: '/growth',    label: 'Crecimiento',  icon: 'chart',   color: '#7dd3fc' },
  ];
}
