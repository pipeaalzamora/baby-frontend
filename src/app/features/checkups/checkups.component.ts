import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { CheckupService } from '../../core/services/checkup.service';
import { Checkup, Prescription } from '../../core/models/models';

interface CheckupForm {
  date: string;
  doctorName: string;
  center: string;
  observations: string;
  nextAppointment: string;
  prescriptions: Prescription[];
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

  checkups = signal<Checkup[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  showForm = signal(false);

  form: CheckupForm = this.emptyForm();

  ngOnInit() {
    this.load();
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
}
