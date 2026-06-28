import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { childGuard } from './core/guards/child.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent),
  },
  {
    // Política de privacidad: pública, sin authGuard (requisito de las tiendas)
    path: 'privacy',
    loadComponent: () =>
      import('./features/privacy/privacy.component').then(m => m.PrivacyComponent),
  },
  {
    // Setup: requiere auth pero NO childGuard (el bebé aún no existe)
    path: 'setup',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/setup/setup.component').then(m => m.SetupComponent),
  },
  {
    // Aceptar invitación: requiere auth pero NO childGuard
    // (quien acepta puede no tener un perfil propio todavía)
    path: 'invite/:token',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/invite/invite.component').then(m => m.InviteComponent),
  },
  {
    // Resultado del pago Transbank: el backend redirige aquí tras Webpay.
    // Requiere auth pero NO childGuard (el usuario vuelve desde un dominio externo).
    path: 'billing/result',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/billing/billing-result.component').then(m => m.BillingResultComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard, childGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent),
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
      {
        path: 'medications',
        loadComponent: () =>
          import('./features/medications/medications.component').then(m => m.MedicationsComponent),
      },
      {
        path: 'milestones',
        loadComponent: () =>
          import('./features/milestones/milestones.component').then(m => m.MilestonesComponent),
      },
      {
        path: 'photos',
        loadComponent: () =>
          import('./features/photos/photos.component').then(m => m.PhotosComponent),
      },
      {
        path: 'diary',
        loadComponent: () =>
          import('./features/diary/diary.component').then(m => m.DiaryComponent),
      },
      {
        path: 'explore',
        loadComponent: () =>
          import('./features/explore/explore.component').then(m => m.ExploreComponent),
      },
      {
        path: 'caregivers',
        loadComponent: () =>
          import('./features/caregivers/caregivers.component').then(m => m.CaregiversComponent),
      },
      {
        path: 'assistant',
        loadComponent: () =>
          import('./features/assistant/assistant.component').then(m => m.AssistantComponent),
      },
      {
        path: 'premium',
        loadComponent: () =>
          import('./features/premium/premium.component').then(m => m.PremiumComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
