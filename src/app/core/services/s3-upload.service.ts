import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UploadProgress {
  progress: number;
  error?: string;
}

export interface PresignedUpload {
  uploadUrl: string;
  bucket: string;
  key: string;
  contentType: string;
  expiresAt: string;
  headers?: Record<string, string>;
}

export interface S3ObjectReference {
  storageProvider: 's3';
  bucket: string;
  key: string;
  contentType: string;
  sizeBytes: number;
}

@Injectable({ providedIn: 'root' })
export class S3UploadService {
  upload(
    presigned: PresignedUpload,
    file: File,
    onProgress: (p: UploadProgress) => void,
  ): Observable<void> {
    return new Observable<void>((observer) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presigned.uploadUrl, true);

      const headers = presigned.headers ?? { 'Content-Type': presigned.contentType };
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress({ progress: Math.round((event.loaded / event.total) * 100) });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress({ progress: 100 });
          observer.next();
          observer.complete();
          return;
        }
        observer.error(new Error('S3 rechazó la subida de la imagen.'));
      };

      xhr.onerror = () => observer.error(new Error('No se pudo subir la imagen a S3.'));
      xhr.onabort = () => observer.error(new Error('Subida cancelada.'));
      xhr.send(file);

      return () => xhr.abort();
    });
  }
}
