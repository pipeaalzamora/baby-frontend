import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GrowthCurves, Measurement } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MeasurementService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/measurements`;
  private growthBase = `${environment.apiUrl}/growth`;

  list() {
    return this.http.get<Measurement[]>(this.base);
  }

  /**
   * Curvas de percentiles OMS para peso, talla y perímetro cefálico.
   * Si se omite `sex`, el backend usa el del perfil activo.
   */
  curves(sex?: 'M' | 'F') {
    let params = new HttpParams();
    if (sex) params = params.set('sex', sex);
    return this.http.get<GrowthCurves>(`${this.growthBase}/curves`, { params });
  }

  create(data: Omit<Measurement, 'id' | 'childId' | 'createdAt'>) {
    return this.http.post<Measurement>(this.base, data);
  }

  delete(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
