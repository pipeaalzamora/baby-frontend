import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type MilestoneCategory = 'motor' | 'social' | 'language' | 'cognitive' | 'feeding';

export interface Milestone {
  id: string;
  childId: string;
  date: string;
  category: MilestoneCategory;
  title: string;
  description: string;
  mediaUrls: string[];
  createdAt: string;
}

export interface AdviceSource {
  name: string;
  url: string;
}

export interface AdviceSection {
  id: string;
  title: string;
  category: string;
  items: string[];
  tips: string[];
}

export interface DevelopmentAdvice {
  ageMonths: number;
  ageLabel: string;
  version: string;
  summary: string;
  sections: AdviceSection[];
  redFlags: string[];
  nextMonths: number[];
  sources: AdviceSource[];
}

@Injectable({ providedIn: 'root' })
export class MilestoneService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/milestones`;
  private developmentBase = `${environment.apiUrl}/development`;

  list() {
    return this.http.get<Milestone[]>(this.base);
  }

  create(data: Partial<Milestone>) {
    return this.http.post<Milestone>(this.base, data);
  }

  delete(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`);
  }

  advice(ageMonths?: number) {
    let params = new HttpParams();
    if (ageMonths !== undefined && ageMonths !== null) {
      params = params.set('ageMonths', String(ageMonths));
    }
    return this.http.get<DevelopmentAdvice>(`${this.developmentBase}/advice`, { params });
  }
}
