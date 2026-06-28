import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/export`;

  /**
   * Descarga el historial de salud en PDF. El interceptor de auth añade el
   * token Firebase en el header Authorization. Recibe la respuesta como blob,
   * crea un object URL y dispara la descarga con un <a download>.
   */
  downloadHealthPdf() {
    return this.http
      .get(`${this.base}/health-pdf`, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((res: HttpResponse<Blob>) => {
          const blob = res.body;
          if (!blob) throw new Error('Respuesta vacía del servidor.');
          this.triggerDownload(blob, this.fileNameFrom(res));
          return true;
        }),
      );
  }

  private fileNameFrom(res: HttpResponse<Blob>): string {
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    if (match?.[1]) return decodeURIComponent(match[1]);
    return `historial-salud-${new Date().toISOString().slice(0, 10)}.pdf`;
  }

  private triggerDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
