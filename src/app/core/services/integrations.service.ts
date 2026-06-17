import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface SourceInfo {
  name: string;
  url: string;
  updatedAt?: string;
  fetchedAt: string;
  license?: string;
  disclaimer?: string;
}

export interface ListResponse<T> {
  source: SourceInfo;
  count: number;
  items: T[];
}

export interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string;
  permalink: string;
  condition?: string;
  seller?: string;
  freeShipping: boolean;
  source: 'mercadolibre' | 'walmart' | 'ebay';
}

export interface HealthTopic {
  title: string;
  url: string;
  summary: string;
}

export interface Recall {
  id: string;
  title: string;
  date: string;
  url: string;
  description: string;
  hazards?: string;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image?: string;
  source: string;
  publishedAt: string;
}

export type ProductSource = 'mercadolibre' | 'walmart' | 'ebay';

@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/integrations`;

  /** Productos para bebé en marketplaces chilenos */
  searchProducts(query: string, source: ProductSource = 'mercadolibre', limit = 20) {
    const params = new HttpParams()
      .set('q', query)
      .set('source', source)
      .set('limit', limit);
    return this.http.get<ListResponse<Product>>(`${this.base}/products`, { params });
  }

  /** Estado de conexión OAuth con Mercado Libre */
  mlStatus() {
    return this.http.get<{ connected: boolean }>(`${this.base}/ml/status`);
  }

  /** Obtiene la URL de autorización de Mercado Libre para conectar la cuenta */
  mlConnectUrl() {
    return this.http.get<{ authUrl: string }>(`${this.base}/ml/connect`);
  }

  /** Temas de salud en español (MedlinePlus) */
  searchHealthTopics(query: string, limit = 10) {
    const params = new HttpParams().set('q', query).set('limit', limit);
    return this.http.get<ListResponse<HealthTopic>>(`${this.base}/health-topics`, { params });
  }

  /** Alertas de productos retirados (CPSC) */
  searchRecalls(query = '', limit = 20) {
    let params = new HttpParams().set('limit', limit);
    if (query) params = params.set('q', query);
    return this.http.get<ListResponse<Recall>>(`${this.base}/recalls`, { params });
  }

  /** Noticias en español filtradas por Chile (GNews) */
  searchNews(query = 'bebé crianza', limit = 10) {
    const params = new HttpParams().set('q', query).set('limit', limit);
    return this.http.get<ListResponse<NewsArticle>>(`${this.base}/news`, { params });
  }
}
