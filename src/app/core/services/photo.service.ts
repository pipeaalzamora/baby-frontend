import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FirebaseService, UploadProgress } from './firebase.service';
import { AuthService } from './auth.service';

export interface Photo {
  id: string;
  childId: string;
  url: string;
  date: string;
  tags: string[];
  caption?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private http     = inject(HttpClient);
  private firebase = inject(FirebaseService);
  private auth     = inject(AuthService);
  private base     = `${environment.apiUrl}/photos`;

  list() {
    return this.http.get<Photo[]>(this.base);
  }

  /**
   * Sube una foto a Firebase Storage y luego registra la URL en el backend.
   * @param file     Archivo seleccionado por el usuario
   * @param date     Fecha de la foto (YYYY-MM-DD)
   * @param caption  Descripción opcional
   * @param tags     Etiquetas opcionales
   * @param onProgress Callback de progreso (0-100)
   */
  upload(
    file: File,
    date: string,
    caption: string,
    tags: string[],
    onProgress: (p: UploadProgress) => void,
  ): Observable<Photo> {
    const userId    = this.auth.user()?.id ?? 'unknown';
    const ext       = file.name.split('.').pop() ?? 'jpg';
    const timestamp = Date.now();
    const path      = `baby-photos/${userId}/${timestamp}.${ext}`;

    return new Observable<Photo>((observer) => {
      this.firebase.uploadFile(path, file, (progress) => {
        onProgress(progress);

        if (progress.error) {
          observer.error(new Error(progress.error));
          return;
        }

        if (progress.url) {
          // URL obtenida de Firebase — registrarla en nuestro backend
          this.http.post<Photo>(this.base, {
            url: progress.url,
            date,
            caption: caption || undefined,
            tags,
          }).subscribe({
            next: (photo) => { observer.next(photo); observer.complete(); },
            error: (err)  => observer.error(err),
          });
        }
      });
    });
  }

  delete(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
