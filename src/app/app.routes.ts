import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'vaccines',
        loadComponent: () =>
          import('./features/vaccines/vaccines.component').then(m => m.VaccinesComponent),
      },
      {
        path: 'growth',
        loadComponent: () =>
          import('./features/growth/growth.component').then(m => m.GrowthComponent),
      },
      {
        path: 'checkups',
        loadComponent: () =>
          import('./features/checkups/checkups.component').then(m => m.CheckupsComponent),
      },
      {
        path: 'nutrition',
        loadComponent: () =>
          import('./features/nutrition/nutrition.component').then(m => m.NutritionComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
