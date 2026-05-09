import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Child } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ChildService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/child`;

  get() {
    return this.http.get<Child>(this.base);
  }

  upsert(data: Partial<Child>) {
    return this.http.post<Child>(this.base, data);
  }
}
