import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Measurement } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MeasurementService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/measurements`;

  list() {
    return this.http.get<Measurement[]>(this.base);
  }

  create(data: Omit<Measurement, 'id' | 'childId' | 'createdAt'>) {
    return this.http.post<Measurement>(this.base, data);
  }

  delete(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
