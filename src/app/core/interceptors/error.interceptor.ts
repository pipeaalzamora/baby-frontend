import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { catchError, throwError } from 'rxjs';

/**
 * Interceptor global de errores HTTP.
 * - 401 → logout automático (token expirado o inválido)
 * - 403 readOnly → aviso amistoso "perfil de solo lectura"
 * - 0   → error de red / servidor caído
 * Deja pasar todos los demás errores para que los componentes los manejen.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        // Token inválido o expirado — limpiar sesión y redirigir
        auth.logout();
        return throwError(() => err);
      }

      if (err.status === 403 && err.error?.readOnly === true) {
        // Perfil compartido de solo lectura — mensaje amistoso
        toast.info('Este perfil es de solo lectura');
        return throwError(() => err);
      }

      if (err.status === 0) {
        // Sin conexión o servidor caído — enriquecer el error
        const networkErr = new HttpErrorResponse({
          error: { error: 'Sin conexión con el servidor. Verifica tu red.' },
          status: 0,
          statusText: 'Unknown Error',
          url: req.url,
        });
        return throwError(() => networkErr);
      }

      return throwError(() => err);
    }),
  );
};
