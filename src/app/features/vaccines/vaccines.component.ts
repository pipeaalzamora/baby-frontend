import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { VaccineService } from '../../core/services/vaccine.service';
import { Vaccine } from '../../core/models/models';

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

  vaccines = signal<Vaccine[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  // Modal state
  selectedVaccine = signal<Vaccine | null>(null);
  form: AdministerForm = {
    administeredDate: new Date().toISOString().slice(0, 10),
    location: '',
    batchLot: '',
    reactions: '',
    notes: '',
  };

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (list) => {
        this.vaccines.set(list.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar vacunas.');
        this.loading.set(false);
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
  }

  closeModal() {
    this.selectedVaccine.set(null);
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
