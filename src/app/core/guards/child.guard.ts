import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ChildService } from '../services/child.service';
import { catchError, map, of } from 'rxjs';

/**
 * Redirige a /setup si el usuario aún no tiene perfil de bebé.
 * Optimización: si la sesión local ya contiene childId, no hace llamada a la API.
 */
export const childGuard: CanActivateFn = () => {
  const auth     = inject(AuthService);
  const childSvc = inject(ChildService);
  const router   = inject(Router);

  // Si el usuario ya tiene childId en sesión, no necesitamos ir a la API
  const user = auth.user();
  if (user?.childId) {
    return true;
  }

  // Sin childId en sesión → verificar en la API (primer login post-registro)
  return childSvc.get().pipe(
    map((child) => {
      // Actualizar el childId en sesión para no hacer esta llamada en navegaciones futuras
      if (child?.id) {
        auth.updateChildId(child.id);
      }
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/setup']))), // 404 → setup
  );
};
