import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Vaccine } from '../models/models';

@Injectable({ providedIn: 'root' })
export class VaccineService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/vaccines`;

  list() {
    return this.http.get<Vaccine[]>(this.base);
  }

  markAdministered(id: string, data: { administeredDate: string; location?: string; batchLot?: string; reactions?: string; notes?: string }) {
    return this.http.post<Vaccine>(`${this.base}/${id}`, data);
  }

  bulkCreate(vaccines: Partial<Vaccine>[]) {
    return this.http.post<{ inserted: number }>(`${this.base}/bulk`, vaccines);
  }
}
