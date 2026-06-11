import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Medication {
  id: string;
  childId: string;
  name: string;
  dosage: string;
  frequencyHours: number;
  startDate: string;
  endDate?: string;
  active: boolean;
  prescribedBy: string;
  reason: string;
  purchasePharmacy?: string;
  purchaseAddress?: string;
  purchaseCommune?: string;
  medicineRegistration?: string;
  medicineHolder?: string;
  saleCondition?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class MedicationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/medications`;

  list() {
    return this.http.get<Medication[]>(this.base);
  }

  create(data: Partial<Medication>) {
    return this.http.post<Medication>(this.base, data);
  }

  patch(id: string, data: Partial<Medication>) {
    return this.http.patch<Medication>(`${this.base}/${id}`, data);
  }

  delete(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }
}
