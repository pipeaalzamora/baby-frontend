import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Checkup } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CheckupService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/checkups`;

  list() {
    return this.http.get<Checkup[]>(this.base);
  }

  create(data: Partial<Checkup>) {
    return this.http.post<Checkup>(this.base, data);
  }

  delete(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
