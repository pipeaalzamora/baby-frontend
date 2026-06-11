import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { from, map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return from(auth.restoreSession()).pipe(
    map((isLoggedIn) => isLoggedIn ? true : router.createUrlTree(['/login'])),
  );
};
