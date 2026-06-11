import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type DiaryType = 'feeding' | 'sleep' | 'diaper' | 'mood' | 'note';

export interface DiaryEntry {
  id: string;
  childId: string;
  date: string;
  type: DiaryType;
  data: Record<string, any>;
  notes?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DiaryService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/diary`;

  list() { return this.http.get<DiaryEntry[]>(this.base); }
  create(data: Partial<DiaryEntry>) { return this.http.post<DiaryEntry>(this.base, data); }
  delete(id: string) { return this.http.delete<{ ok: boolean }>(`${this.base}/${id}`); }
}
