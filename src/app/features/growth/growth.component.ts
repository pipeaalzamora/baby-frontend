import {
  Component, OnInit, OnDestroy, inject, signal,
} from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MeasurementService } from '../../core/services/measurement.service';
import { Measurement } from '../../core/models/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface MeasurementForm {
  date: string;
  weightKg: number | null;
  heightCm: number | null;
  headCircumferenceCm: number | null;
}

@Component({
  selector: 'app-growth',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  templateUrl: './growth.component.html',
  styleUrls: ['./growth.component.scss'],
})
export class GrowthComponent implements OnInit, OnDestroy {
  private svc = inject(MeasurementService);

  measurements = signal<Measurement[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  error        = signal<string | null>(null);
  success      = signal<string | null>(null);
  showForm     = signal(false);

  form: MeasurementForm = {
    date: new Date().toISOString().slice(0, 10),
    weightKg: null,
    heightCm: null,
    headCircumferenceCm: null,
  };

  private weightChart: Chart | null = null;
  private heightChart: Chart | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() { this.load(); }

  ngOnDestroy() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.weightChart?.destroy();
    this.heightChart?.destroy();
  }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (list) => {
        this.measurements.set(list.sort((a, b) => a.date.localeCompare(b.date)));
        this.loading.set(false);
        // Double rAF: first frame Angular updates DOM, second frame browser paints
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.tryRenderCharts();
          });
        });
      },
      error: () => {
        this.error.set('Error al cargar mediciones.');
        this.loading.set(false);
      },
    });
  }

  /** Retry until both canvas elements are in the DOM */
  private tryRenderCharts(attempt = 0) {
    const w = document.getElementById('weightChart') as HTMLCanvasElement | null;
    const h = document.getElementById('heightChart') as HTMLCanvasElement | null;

    if (w && h) {
      this.renderCharts(w, h);
    } else if (attempt < 20) {
      // Retry every 50ms up to 1 second
      this.retryTimer = setTimeout(() => this.tryRenderCharts(attempt + 1), 50);
    }
  }

  get lastMeasurement(): Measurement | null {
    const list = this.measurements();
    return list.length > 0 ? list[list.length - 1] : null;
  }

  toggleForm() {
    this.showForm.update(v => !v);
    this.error.set(null);
  }

  submit() {
    if (!this.form.date || this.form.weightKg == null || this.form.heightCm == null) {
      this.error.set('Fecha, peso y talla son obligatorios.');
      return;
    }
    if (this.form.weightKg <= 0 || this.form.weightKg > 30) {
      this.error.set('El peso debe estar entre 0 y 30 kg.');
      return;
    }
    if (this.form.heightCm <= 0 || this.form.heightCm > 130) {
      this.error.set('La talla debe estar entre 0 y 130 cm.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.svc.create({
      date: this.form.date,
      weightKg: this.form.weightKg,
      heightCm: this.form.heightCm,
      headCircumferenceCm: this.form.headCircumferenceCm ?? 0,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.success.set('Medición registrada correctamente.');
        setTimeout(() => this.success.set(null), 4000);
        this.form = {
          date: new Date().toISOString().slice(0, 10),
          weightKg: null, heightCm: null, headCircumferenceCm: null,
        };
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Error al guardar.');
      },
    });
  }

  // ─── Charts ───────────────────────────────────────────────────────────────

  private isDark(): boolean {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  private renderCharts(
    wCanvas: HTMLCanvasElement,
    hCanvas: HTMLCanvasElement,
  ) {
    const list = this.measurements();
    if (list.length === 0) return;

    const dark      = this.isDark();
    const gridColor = dark ? 'rgba(125,211,252,0.08)' : 'rgba(0,0,0,0.06)';
    const tickColor = dark ? '#7dd3fc'                : '#64748b';
    const tooltipBg = dark ? '#0f2040'                : '#ffffff';
    const tooltipFg = dark ? '#e2e8f0'                : '#1e293b';

    const labels  = list.map(m => m.date.slice(0, 10));
    const weights = list.map(m => m.weightKg);
    const heights = list.map(m => m.heightCm);

    const sharedOptions = (accentColor: string) => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700 },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          backgroundColor: tooltipBg,
          titleColor: accentColor,
          bodyColor: tooltipFg,
          borderColor: accentColor + '44',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: gridColor },
          ticks: { color: tickColor, font: { size: 11 } },
          border: { display: false },
        },
        x: {
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 11 }, maxRotation: 0 },
          border: { display: false },
        },
      },
    });

    // Weight
    this.weightChart?.destroy();
    this.weightChart = new Chart(wCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Peso (kg)',
          data: weights,
          borderColor: '#0ea5e9',
          backgroundColor: dark ? 'rgba(14,165,233,0.18)' : 'rgba(14,165,233,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#0ea5e9',
          pointBorderColor: dark ? '#0f2040' : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: true,
        }],
      },
      options: sharedOptions('#0ea5e9'),
    });

    // Height
    this.heightChart?.destroy();
    this.heightChart = new Chart(hCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Talla (cm)',
          data: heights,
          borderColor: '#7dd3fc',
          backgroundColor: dark ? 'rgba(125,211,252,0.18)' : 'rgba(125,211,252,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: '#7dd3fc',
          pointBorderColor: dark ? '#0f2040' : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: true,
        }],
      },
      options: sharedOptions('#7dd3fc'),
    });
  }
}
