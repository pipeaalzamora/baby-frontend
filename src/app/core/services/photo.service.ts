import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PresignedUpload, S3ObjectReference, S3UploadService, UploadProgress } from './s3-upload.service';

export interface Photo {
  id: string;
  childId: string;
  url: string;
  storageProvider?: 's3';
  bucket?: string;
  key?: string;
  contentType?: string;
  sizeBytes?: number;
  date: string;
  tags: string[];
  caption?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private http = inject(HttpClient);
  private s3   = inject(S3UploadService);
  private base = `${environment.apiUrl}/photos`;

  list() {
    return this.http.get<Photo[]>(this.base);
  }

  /**
   * Sube una foto a S3 con URL firmada y luego registra la metadata en backend.
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
    return this.http.post<PresignedUpload>(`${this.base}/presign`, {
      fileName: file.name,
      contentType: file.type || 'image/jpeg',
      sizeBytes: file.size,
      date,
    }).pipe(
      switchMap((presigned) => this.s3.upload(presigned, file, onProgress).pipe(
        switchMap(() => {
          const ref: S3ObjectReference = {
            storageProvider: 's3',
            bucket: presigned.bucket,
            key: presigned.key,
            contentType: presigned.contentType,
            sizeBytes: file.size,
          };
          return this.http.post<Photo>(this.base, {
            ...ref,
            date,
            caption: caption || undefined,
            tags,
          });
        }),
      )),
    );
  }

  delete(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
