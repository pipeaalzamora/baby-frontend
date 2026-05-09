import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models/models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/notifications`;

  list() {
    return this.http.get<AppNotification[]>(this.base);
  }

  markRead(id: string) {
    return this.http.patch<AppNotification>(`${this.base}/${id}/read`, {});
  }

  markAllRead() {
    return this.http.patch(`${this.base}/read-all`, {});
  }
}
