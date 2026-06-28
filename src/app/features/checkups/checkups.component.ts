import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { CheckupService } from '../../core/services/checkup.service';
import { Checkup, Prescription } from '../../core/models/models';
import { ChileHealthService, HealthCenter, SourceInfo, friendlyExternalError } from '../../core/services/chile-health.service';

interface CheckupForm {
  date: string;
  doctorName: string;
  center: string;
  observations: string;
  nextAppointment: string;
  prescriptions: Prescription[];
}

interface SuggestedControl {
  key: string;
  age: string;
  focus: string;
}

@Component({
  selector: 'app-checkups',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  templateUrl: './checkups.component.html',
  styleUrls: ['./checkups.component.scss'],
})
export class CheckupsComponent implements OnInit {
  private svc = inject(CheckupService);
  private chile = inject(ChileHealthService);

  checkups = signal<Checkup[]>([]);
  healthCenters = signal<HealthCenter[]>([]);
  healthSource = signal<SourceInfo | null>(null);
  loading = signal(true);
  loadingCenters = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  externalError = signal<string | null>(null);
  success = signal<string | null>(null);
  showForm = signal(false);

  form: CheckupForm = this.emptyForm();
  centerSearch = 'CESFAM';

  readonly controlGuide: SuggestedControl[] = [
    { key: 'newborn', age: 'Recién nacido', focus: 'Primer control, lactancia, peso, ictericia y señales de alerta.' },
    { key: '1m', age: '1 mes', focus: 'Crecimiento, alimentación, sueño y adaptación familiar.' },
    { key: '2m', age: '2 meses', focus: 'Desarrollo, vacunas, alimentación y seguridad en el hogar.' },
    { key: '4m', age: '4 meses', focus: 'Crecimiento, apego, sueño y preparación de próximas etapas.' },
    { key: '6m', age: '6 meses', focus: 'Inicio de alimentación complementaria y seguimiento nutricional.' },
    { key: '8-12m', age: '8 a 12 meses', focus: 'Desarrollo motor, lenguaje inicial, dentición y prevención de accidentes.' },
    { key: '18m', age: '18 meses', focus: 'Lenguaje, conducta, alimentación familiar y vacunas correspondientes.' },
    { key: '2-4y', age: '2 a 4 años', focus: 'Control periódico, desarrollo integral, salud bucal y crianza.' },
  ];

  ngOnInit() {
    this.load();
    this.searchCenters();
  }

  private emptyForm(): CheckupForm {
    return {
      date: new Date().toISOString().slice(0, 10),
      doctorName: '',
      center: '',
      observations: '',
      nextAppointment: '',
      prescriptions: [],
    };
  }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (list) => {
        this.checkups.set(list.sort((a, b) => b.date.localeCompare(a.date)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar los controles médicos.');
        this.loading.set(false);
      },
    });
  }

  toggleForm() {
    this.showForm.update((v) => !v);
    if (!this.showForm()) {
      this.form = this.emptyForm();
      this.error.set(null);
    }
  }

  addPrescription() {
    this.form.prescriptions = [
      ...this.form.prescriptions,
      { medication: '', dosage: '', duration: '' },
    ];
  }

  removePrescription(i: number) {
    this.form.prescriptions = this.form.prescriptions.filter((_, idx) => idx !== i);
  }

  submit() {
    if (!this.form.date || !this.form.doctorName.trim() || !this.form.center.trim()) {
      this.error.set('Fecha, médico y centro son obligatorios.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const payload: Partial<Checkup> = {
      date: this.form.date,
      doctorName: this.form.doctorName.trim(),
      center: this.form.center.trim(),
      observations: this.form.observations.trim(),
      prescriptions: this.form.prescriptions.filter(
        (p) => p.medication.trim() && p.dosage.trim() && p.duration.trim()
      ),
      nextAppointment: this.form.nextAppointment || undefined,
      status: 'completed',
      completedAt: this.form.date,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form = this.emptyForm();
        this.success.set('Control médico registrado correctamente.');
        setTimeout(() => this.success.set(null), 4000);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Error al guardar el control.');
      },
    });
  }

  deleteCheckup(id: string) {
    if (!confirm('¿Eliminar este control médico?')) return;
    this.svc.delete(id).subscribe({
      next: () => {
        this.success.set('Control eliminado.');
        setTimeout(() => this.success.set(null), 3000);
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Error al eliminar.');
        setTimeout(() => this.error.set(null), 3000);
      },
    });
  }

  suggestedCheckup(item: SuggestedControl): Checkup | undefined {
    return this.checkups().find((checkup) => checkup.suggestedKey === item.key);
  }

  isSuggestedCompleted(item: SuggestedControl): boolean {
    return this.suggestedCheckup(item)?.status === 'completed';
  }

  toggleSuggestedControl(item: SuggestedControl) {
    const existing = this.suggestedCheckup(item);
    const completed = existing?.status === 'completed';
    const today = new Date().toISOString().slice(0, 10);
    this.saving.set(true);
    this.error.set(null);

    if (existing) {
      this.svc.patch(existing.id, {
        status: completed ? 'pending' : 'completed',
        completedAt: completed ? undefined : today,
      }).subscribe({
        next: () => {
          this.saving.set(false);
          this.success.set(completed ? 'Control sugerido marcado como pendiente.' : 'Control sugerido marcado como completado.');
          setTimeout(() => this.success.set(null), 3500);
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.error ?? 'Error al actualizar el control sugerido.');
        },
      });
      return;
    }

    this.svc.create({
      date: today,
      doctorName: 'Control de salud',
      center: 'Por completar',
      observations: item.focus,
      prescriptions: [],
      status: 'completed',
      completedAt: today,
      suggestedKey: item.key,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.success.set('Control sugerido marcado como completado.');
        setTimeout(() => this.success.set(null), 3500);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Error al completar el control sugerido.');
      },
    });
  }

  searchCenters() {
    this.loadingCenters.set(true);
    this.externalError.set(null);
    this.chile.healthCenters({ search: this.centerSearch.trim() || undefined, limit: 10 }).subscribe({
      next: (res) => {
        this.healthCenters.set(res.items);
        this.healthSource.set(res.source);
        this.loadingCenters.set(false);
      },
      error: (err) => {
        this.loadingCenters.set(false);
        this.externalError.set(friendlyExternalError(err, 'No pudimos consultar establecimientos DEIS.'));
      },
    });
  }
}
