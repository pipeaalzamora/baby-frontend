import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BillingService } from '../../core/services/billing.service';
import { ToastService } from '../../core/services/toast.service';

interface PremiumBenefit {
  icon: 'chat' | 'pdf' | 'chart' | 'shield';
  title: string;
  description: string;
}

@Component({
  selector: 'app-premium',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './premium.component.html',
  styleUrls: ['./premium.component.scss'],
})
export class PremiumComponent implements OnInit {
  private billing = inject(BillingService);
  private toast = inject(ToastService);

  readonly state = this.billing.state;
  readonly premium = this.billing.premium;

  loading = signal(true);
  starting = signal(false);

  /** Precio formateado en pesos chilenos (CLP, sin decimales). */
  readonly priceLabel = computed(() => {
    const clp = this.state()?.priceClp ?? 0;
    return this.formatClp(clp);
  });

  /** Fecha de vencimiento legible cuando el usuario ya es premium. */
  readonly expiresLabel = computed(() => {
    const expiresAt = this.state()?.expiresAt;
    if (!expiresAt) return null;
    const d = new Date(expiresAt);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
  });

  readonly benefits: PremiumBenefit[] = [
    {
      icon: 'chat',
      title: 'Asistente IA ilimitado',
      description: 'Conversa sin límites diarios sobre crianza, sueño, alimentación y desarrollo.',
    },
    {
      icon: 'pdf',
      title: 'Exportar historial en PDF',
      description: 'Descarga el historial de salud completo de tu bebé para compartirlo con el pediatra.',
    },
    {
      icon: 'chart',
      title: 'Curvas de crecimiento OMS',
      description: 'Visualiza percentiles y curvas de peso y talla con el estándar de la OMS.',
    },
    {
      icon: 'shield',
      title: 'Apoya el proyecto',
      description: 'Tu aporte ayuda a mantener la app y a seguir sumando funciones para tu familia.',
    },
  ];

  ngOnInit() {
    this.billing.status().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  goPremium() {
    if (this.starting() || this.premium()) return;
    this.starting.set(true);
    // checkout() navega el navegador a Webpay; si falla, mostramos un aviso.
    this.billing.checkout().subscribe({
      error: (err) => {
        this.starting.set(false);
        this.toast.error(err?.error?.error ?? 'No pudimos iniciar el pago. Intenta nuevamente.');
      },
    });
  }

  private formatClp(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
