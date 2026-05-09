import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ChildService } from '../services/child.service';
import { catchError, map, of } from 'rxjs';

/** Redirige a /setup si el usuario aún no tiene perfil de bebé */
export const childGuard: CanActivateFn = () => {
  const childSvc = inject(ChildService);
  const router   = inject(Router);

  return childSvc.get().pipe(
    map(() => true),                          // tiene bebé → puede entrar
    catchError(() => of(router.createUrlTree(['/setup']))), // 404 → setup
  );
};
