import {
  Component, OnInit, OnDestroy, inject, signal, afterNextRender, Injector,
} from '@angular/core';
import { SlicePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MeasurementService } from '../../core/services/measurement.service';
import { ExportService } from '../../core/services/export.service';
import { ChildService } from '../../core/services/child.service';
import { ToastService } from '../../core/services/toast.service';
import { BillingService } from '../../core/services/billing.service';
import { GrowthCurvePoint, GrowthCurves, Measurement } from '../../core/models/models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface MeasurementForm {
  date: string;
  weightKg: number | null;
  heightCm: number | null;
  headCircumferenceCm: number | null;
}

type PercentileKey = 'p3' | 'p15' | 'p50' | 'p85' | 'p97';

@Component({
  selector: 'app-growth',
  standalone: true,
  imports: [FormsModule, SlicePipe, DecimalPipe],
  templateUrl: './growth.component.html',
  styleUrls: ['./growth.component.scss'],
})
export class GrowthComponent implements OnInit, OnDestroy {
  private svc      = inject(MeasurementService);
  private exportSvc = inject(ExportService);
  private childSvc = inject(ChildService);
  private toast    = inject(ToastService);
  private billing  = inject(BillingService);
  private router   = inject(Router);
  private injector = inject(Injector);

  measurements = signal<Measurement[]>([]);
  curves       = signal<GrowthCurves | null>(null);
  loading      = signal(true);
  saving       = signal(false);
  exporting    = signal(false);
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

  ngOnInit() { this.load(); }

  ngOnDestroy() {
    this.weightChart?.destroy();
    this.heightChart?.destroy();
  }

  load() {
    this.loading.set(true);
    forkJoin({
      list: this.svc.list(),
      curves: this.svc.curves().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ list, curves }) => {
        this.measurements.set(list.sort((a, b) => a.date.localeCompare(b.date)));
        this.curves.set(curves);
        this.loading.set(false);
        // afterNextRender garantiza que Angular terminó de renderizar el DOM
        afterNextRender(() => {
          const w = document.getElementById('weightChart') as HTMLCanvasElement | null;
          const h = document.getElementById('heightChart') as HTMLCanvasElement | null;
          if (w && h) this.renderCharts(w, h);
        }, { injector: this.injector });
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Error al cargar mediciones.');
        this.loading.set(false);
      },
    });
  }

  get lastMeasurement(): Measurement | null {
    const list = this.measurements();
    return list.length > 0 ? list[list.length - 1] : null;
  }

  /** Indica si una medición trae datos de crecimiento OMS con al menos un indicador. */
  hasGrowth(m: Measurement | null | undefined): boolean {
    const g = m?.growth;
    return !!g && (!!g.weight || !!g.height || !!g.head);
  }

  toggleForm() {
    this.showForm.update(v => !v);
    this.error.set(null);
  }

  exportPdf() {
    if (this.exporting()) return;
    // Gating: la exportación PDF es premium. Si no lo es, llevamos a /premium.
    if (!this.billing.premium()) {
      this.toast.info('Exportar el historial en PDF es una función premium.');
      this.router.navigate(['/premium']);
      return;
    }
    this.exporting.set(true);
    this.exportSvc.downloadHealthPdf().subscribe({
      next: () => {
        this.exporting.set(false);
        this.toast.success('Historial exportado en PDF.');
      },
      error: (err) => {
        this.exporting.set(false);
        // 402: el backend exige premium → redirigimos con un aviso.
        if (err?.status === 402) {
          this.toast.info('Necesitas premium para exportar el PDF.');
          this.router.navigate(['/premium']);
          return;
        }
        // El interceptor ya avisa los 403 readOnly; el resto lo mostramos aquí.
        if (err?.status !== 403) {
          this.toast.error(err?.error?.error ?? 'No se pudo exportar el PDF.');
        }
      },
    });
  }

  /** Atajo reactivo para el template: ¿el usuario es premium? */
  get isPremium(): boolean {
    return this.billing.premium();
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

  deleteRecord(id: string) {
    if (!confirm('¿Eliminar esta medición?')) return;
    this.svc.delete(id).subscribe({
      next: () => {
        this.success.set('Medición eliminada.');
        setTimeout(() => this.success.set(null), 3000);
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Error al eliminar.');
        setTimeout(() => this.error.set(null), 3000);
      },
    });
  }

  // ─── Charts ───────────────────────────────────────────────────────────────

  private isDark(): boolean {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  /** Edad en meses (fraccional) de una medición respecto a la fecha de nacimiento. */
  private ageMonths(dateStr: string): number {
    const birth = this.childSvc.activeChild()?.birthDate;
    if (!birth) return 0;
    const b = new Date(birth + 'T00:00:00').getTime();
    const d = new Date(dateStr.slice(0, 10) + 'T00:00:00').getTime();
    if (isNaN(b) || isNaN(d)) return 0;
    return Math.max(0, (d - b) / 86400000 / 30.4375);
  }

  /** Construye las líneas de percentiles OMS (P3, P15, P50, P85, P97) tenues de fondo. */
  private percentileDatasets(points: GrowthCurvePoint[] | undefined, maxMonth: number) {
    if (!points || points.length === 0) return [];
    const visible = points.filter(p => p.month <= maxMonth);
    const src = visible.length > 1 ? visible : points.slice(0, Math.max(2, Math.ceil(maxMonth) + 1));

    const line = (key: PercentileKey, label: string, color: string, dash: number[], width: number) => ({
      label,
      data: src.map(p => ({ x: p.month, y: p[key] })),
      borderColor: color,
      backgroundColor: 'transparent',
      borderWidth: width,
      borderDash: dash,
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
      tension: 0.3,
      order: 2,
    });

    const outer = 'rgba(148,163,184,0.55)';
    const mid   = 'rgba(148,163,184,0.45)';
    const median = 'rgba(100,116,139,0.85)';

    return [
      line('p97', 'P97', outer,  [5, 4], 1),
      line('p85', 'P85', mid,    [2, 3], 1),
      line('p50', 'P50', median, [],     1.4),
      line('p15', 'P15', mid,    [2, 3], 1),
      line('p3',  'P3',  outer,  [5, 4], 1),
    ];
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
    const legendFg  = dark ? '#cbd5e1'                : '#475569';

    // Datos del niño en eje de edad (meses)
    const weightPoints = list.map(m => ({ x: this.ageMonths(m.date), y: m.weightKg }));
    const heightPoints = list.map(m => ({ x: this.ageMonths(m.date), y: m.heightCm }));
    const maxAge = Math.max(3, ...weightPoints.map(p => p.x));
    const maxMonth = Math.ceil(maxAge) + 1;

    const curves = this.curves();

    const sharedOptions = (accentColor: string) => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700 },
      interaction: { mode: 'nearest' as const, intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom' as const,
          labels: {
            color: legendFg,
            boxWidth: 18,
            boxHeight: 2,
            font: { size: 10 },
            usePointStyle: false,
          },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: accentColor,
          bodyColor: tooltipFg,
          borderColor: accentColor + '44',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            title: (items: any[]) => items.length ? `${(+items[0].parsed.x).toFixed(1)} meses` : '',
          },
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
          type: 'linear' as const,
          min: 0,
          max: maxMonth,
          title: { display: true, text: 'Edad (meses)', color: tickColor, font: { size: 10 } },
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 11 }, maxRotation: 0, precision: 0 },
          border: { display: false },
        },
      },
    });

    const childDataset = (label: string, data: { x: number; y: number }[], color: string) => ({
      label,
      data,
      borderColor: color,
      backgroundColor: dark ? color + '2e' : color + '14',
      borderWidth: 2.5,
      pointBackgroundColor: color,
      pointBorderColor: dark ? '#0f2040' : '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.4,
      fill: false,
      order: 1,
    });

    // Weight
    this.weightChart?.destroy();
    this.weightChart = new Chart(wCanvas, {
      type: 'line',
      data: {
        datasets: [
          childDataset('Peso (kg)', weightPoints, '#0ea5e9'),
          ...this.percentileDatasets(curves?.weight, maxMonth),
        ],
      },
      options: sharedOptions('#0ea5e9'),
    });

    // Height
    this.heightChart?.destroy();
    this.heightChart = new Chart(hCanvas, {
      type: 'line',
      data: {
        datasets: [
          childDataset('Talla (cm)', heightPoints, '#7dd3fc'),
          ...this.percentileDatasets(curves?.height, maxMonth),
        ],
      },
      options: sharedOptions('#7dd3fc'),
    });
  }
}
