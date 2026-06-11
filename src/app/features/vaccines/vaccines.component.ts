import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { VaccineService } from '../../core/services/vaccine.service';
import { Vaccine } from '../../core/models/models';
import { ChileHealthService, HealthCenter, SourceInfo } from '../../core/services/chile-health.service';

interface AdministerForm {
  administeredDate: string;
  location: string;
  batchLot: string;
  reactions: string;
  notes: string;
}

@Component({
  selector: 'app-vaccines',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  templateUrl: './vaccines.component.html',
  styleUrls: ['./vaccines.component.scss'],
})
export class VaccinesComponent implements OnInit {
  private svc = inject(VaccineService);
  private chile = inject(ChileHealthService);

  vaccines = signal<Vaccine[]>([]);
  healthCenters = signal<HealthCenter[]>([]);
  healthSource = signal<SourceInfo | null>(null);
  loading = signal(true);
  loadingCenters = signal(false);
  seeding = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  centerError = signal<string | null>(null);
  success = signal<string | null>(null);
  scheduleSource = signal<{ source: string; version: string; url: string } | null>(null);

  // Modal state
  selectedVaccine = signal<Vaccine | null>(null);
  form: AdministerForm = {
    administeredDate: new Date().toISOString().slice(0, 10),
    location: '',
    batchLot: '',
    reactions: '',
    notes: '',
  };
  centerSearch = 'CESFAM';

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (list) => {
        const sorted = list.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
        this.vaccines.set(sorted);
        if (sorted.length > 0) {
          const sourced = sorted.find((v) => v.source || v.scheduleVersion);
          if (sourced) {
            this.scheduleSource.set({
              source: sourced.source ?? 'Programa Nacional de Inmunizaciones',
              version: sourced.scheduleVersion ?? 'Calendario local',
              url: 'https://vacunas.minsal.cl/calendarios-de-vacunacion/',
            });
          }
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar vacunas.');
        this.loading.set(false);
      },
    });
  }

  seedLocalSchedule() {
    this.seeding.set(true);
    this.error.set(null);
    this.svc.seedLocal().subscribe({
      next: (res) => {
        this.scheduleSource.set({ source: res.source, version: res.version, url: res.url });
        this.success.set(`Calendario local creado: ${res.inserted} nuevas, ${res.matched} ya existían.`);
        setTimeout(() => this.success.set(null), 4500);
        this.seeding.set(false);
        this.load();
      },
      error: (err) => {
        this.seeding.set(false);
        this.error.set(err?.error?.error ?? 'No pudimos crear el calendario local.');
      },
    });
  }

  get pending() {
    return this.vaccines().filter((v) => v.status === 'pending');
  }

  get administered() {
    return this.vaccines().filter((v) => v.status === 'administered');
  }

  openModal(vaccine: Vaccine) {
    this.selectedVaccine.set(vaccine);
    this.form = {
      administeredDate: new Date().toISOString().slice(0, 10),
      location: '',
      batchLot: '',
      reactions: '',
      notes: '',
    };
    this.error.set(null);
    this.centerError.set(null);
    this.searchHealthCenters();
  }

  closeModal() {
    this.selectedVaccine.set(null);
    this.centerError.set(null);
  }

  searchHealthCenters() {
    this.loadingCenters.set(true);
    this.centerError.set(null);
    this.chile.healthCenters({ search: this.centerSearch.trim() || undefined, limit: 8 }).subscribe({
      next: (res) => {
        this.healthCenters.set(res.items);
        this.healthSource.set(res.source);
        this.loadingCenters.set(false);
      },
      error: () => {
        this.loadingCenters.set(false);
        this.centerError.set('No pudimos consultar establecimientos DEIS/MINSAL.');
      },
    });
  }

  useHealthCenter(center: HealthCenter) {
    this.form.location = `${center.name} - ${center.commune}`;
  }

  confirm() {
    const v = this.selectedVaccine();
    if (!v) return;

    this.saving.set(true);
    this.error.set(null);

    this.svc.markAdministered(v.id, {
      administeredDate: this.form.administeredDate,
      location: this.form.location || undefined,
      batchLot: this.form.batchLot || undefined,
      reactions: this.form.reactions || undefined,
      notes: this.form.notes || undefined,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeModal();
        this.success.set(`Vacuna "${v.name}" marcada como administrada.`);
        setTimeout(() => this.success.set(null), 4000);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Error al guardar.');
      },
    });
  }
}
