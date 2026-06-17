import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import {
  IntegrationsService,
  Product,
  HealthTopic,
  Recall,
  NewsArticle,
  SourceInfo,
  ProductSource,
} from '../../core/services/integrations.service';

type ExploreTab = 'products' | 'health' | 'recalls' | 'news';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss'],
})
export class ExploreComponent implements OnInit {
  private svc = inject(IntegrationsService);

  activeTab = signal<ExploreTab>('products');
  searchQuery = '';
  productSource = signal<ProductSource>('mercadolibre');

  products = signal<Product[]>([]);
  healthTopics = signal<HealthTopic[]>([]);
  recalls = signal<Recall[]>([]);
  news = signal<NewsArticle[]>([]);

  loading = signal(false);
  error = signal<string | null>(null);
  source = signal<SourceInfo | null>(null);

  // Mercado Libre OAuth
  needsMLConnect = signal(false);
  mlConnecting = signal(false);

  // Marca qué tabs ya fueron cargados al menos una vez
  private loaded = signal<Record<ExploreTab, boolean>>({
    products: false,
    health: false,
    recalls: false,
    news: false,
  });

  ngOnInit() {
    // Si volvemos del callback de ML con ?ml=connected, recargar productos
    const params = new URLSearchParams(window.location.search);
    if (params.get('ml') === 'connected') {
      this.activeTab.set('products');
      window.history.replaceState({}, '', window.location.pathname);
    }
    this.search();
    this.svc.searchRecalls('', 20).subscribe({
      next: (res) => {
        this.recalls.set(res.items);
        this.markLoaded('recalls');
      },
      error: () => undefined,
    });
  }

  /** Inicia el flujo OAuth de Mercado Libre redirigiendo al usuario */
  connectMercadoLibre() {
    this.mlConnecting.set(true);
    this.svc.mlConnectUrl().subscribe({
      next: (res) => {
        window.location.href = res.authUrl;
      },
      error: () => {
        this.mlConnecting.set(false);
        this.error.set('No se pudo iniciar la conexión con Mercado Libre.');
      },
    });
  }

  setTab(tab: ExploreTab) {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.error.set(null);
    this.source.set(null);
    // Si el tab no tiene datos cargados, dispara la búsqueda
    if (!this.loaded()[tab]) {
      this.search();
    }
  }

  setProductSource(src: ProductSource) {
    if (this.productSource() === src) return;
    this.productSource.set(src);
    if (this.activeTab() === 'products') {
      this.search();
    }
  }

  search() {
    const tab = this.activeTab();
    const q = this.searchQuery.trim();
    this.loading.set(true);
    this.error.set(null);
    this.source.set(null);

    switch (tab) {
      case 'products': {
        const query = q || 'bebé';
        this.needsMLConnect.set(false);
        this.svc.searchProducts(query, this.productSource(), 20).subscribe({
          next: (res) => {
            this.products.set(res.items);
            this.source.set(res.source);
            this.markLoaded('products');
            this.loading.set(false);
          },
          error: (err) => this.handleError(err),
        });
        break;
      }
      case 'health': {
        const query = q || 'bebé';
        this.svc.searchHealthTopics(query, 10).subscribe({
          next: (res) => {
            this.healthTopics.set(res.items);
            this.source.set(res.source);
            this.markLoaded('health');
            this.loading.set(false);
          },
          error: (err) => this.handleError(err),
        });
        break;
      }
      case 'recalls': {
        this.svc.searchRecalls(q, 20).subscribe({
          next: (res) => {
            this.recalls.set(res.items);
            this.source.set(res.source);
            this.markLoaded('recalls');
            this.loading.set(false);
          },
          error: (err) => this.handleError(err),
        });
        break;
      }
      case 'news': {
        const query = q || 'bebé crianza';
        this.svc.searchNews(query, 10).subscribe({
          next: (res) => {
            this.news.set(res.items);
            this.source.set(res.source);
            this.markLoaded('news');
            this.loading.set(false);
          },
          error: (err) => this.handleError(err),
        });
        break;
      }
    }
  }

  private markLoaded(tab: ExploreTab) {
    this.loaded.update((m) => ({ ...m, [tab]: true }));
  }

  private handleError(err: unknown) {
    this.loading.set(false);
    const e = err as { status?: number; error?: { error?: string; needsMLConnect?: boolean } };
    // Mercado Libre requiere conexión OAuth del usuario
    if (e?.status === 409 && e?.error?.needsMLConnect) {
      this.needsMLConnect.set(true);
      this.error.set(null);
      return;
    }
    if (e?.status === 503) {
      this.error.set('Esta fuente requiere configuración de API key');
    } else {
      this.error.set(e?.error?.error ?? 'No pudimos completar la búsqueda. Intenta nuevamente.');
    }
  }

  isNotConfigured(): boolean {
    return this.error() === 'Esta fuente requiere configuración de API key';
  }

  searchPlaceholder(): string {
    switch (this.activeTab()) {
      case 'products':
        return 'Buscar productos para tu bebé...';
      case 'health':
        return 'Buscar temas de salud...';
      case 'recalls':
        return 'Buscar alertas y retiros...';
      case 'news':
        return 'Buscar noticias...';
    }
  }

  formatPrice(value: number, currency = 'CLP'): string {
    try {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: currency || 'CLP',
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `$${value}`;
    }
  }
}
