import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface SourceInfo {
  name: string;
  url: string;
  updatedAt?: string;
  fetchedAt: string;
  license?: string;
  disclaimer?: string;
}

export interface ChileListResponse<T> {
  source: SourceInfo;
  count: number;
  items: T[];
}

export interface Pharmacy {
  id: string;
  name: string;
  region: string;
  commune: string;
  locality: string;
  address: string;
  phone: string;
  latitude: string;
  longitude: string;
  openTime: string;
  closeTime: string;
  date: string;
  day: string;
}

export interface HealthCenter {
  code: string;
  name: string;
  type: string;
  region: string;
  commune: string;
  address: string;
  phone: string;
  hasEmergency: string;
  urgencyType: string;
  latitude: string;
  longitude: string;
  system: string;
  status: string;
  level: string;
}

export interface MedicineRecord {
  registration: string;
  name: string;
  holder: string;
  saleCondition: string;
}

@Injectable({ providedIn: 'root' })
export class ChileHealthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/external`;

  pharmacies(params: { mode?: 'turnos' | 'all'; comuna?: string; region?: string; search?: string; limit?: number }) {
    return this.http.get<ChileListResponse<Pharmacy>>(`${this.base}/farmacies`, {
      params: this.toParams(params),
    });
  }

  healthCenters(params: { search?: string; comuna?: string; region?: string; limit?: number }) {
    return this.http.get<ChileListResponse<HealthCenter>>(`${this.base}/health-centers`, {
      params: this.toParams(params),
    });
  }

  medicines(params: { search: string; limit?: number }) {
    return this.http.get<ChileListResponse<MedicineRecord>>(`${this.base}/medicine-registry`, {
      params: this.toParams(params),
    });
  }

  private toParams(params: Record<string, string | number | undefined>) {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return httpParams;
  }
}
