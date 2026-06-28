import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { MedicationService, Medication } from '../../core/services/medication.service';
import {
  ChileHealthService,
  MedicineRecord,
  Pharmacy,
  SourceInfo,
  friendlyExternalError,
} from '../../core/services/chile-health.service';

interface MedicationForm {
  name: string;
  dosage: string;
  frequencyHours: number;
  startDate: string;
  endDate: string;
  prescribedBy: string;
  reason: string;
  purchasePharmacy: string;
  purchaseAddress: string;
  purchaseCommune: string;
  medicineRegistration: string;
  medicineHolder: string;
  saleCondition: string;
}

@Component({
  selector: 'app-medications',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  templateUrl: './medications.component.html',
  styleUrls: ['./medications.component.scss'],
})
export class MedicationsComponent implements OnInit {
  private svc = inject(MedicationService);
  private chile = inject(ChileHealthService);

  medications = signal<Medication[]>([]);
  pharmacies = signal<Pharmacy[]>([]);
  pharmacySource = signal<SourceInfo | null>(null);
  medicineResults = signal<MedicineRecord[]>([]);
  medicineSource = signal<SourceInfo | null>(null);
  loading = signal(true);
  loadingPharmacies = signal(false);
  searchingMedicines = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  externalError = signal<string | null>(null);
  success = signal<string | null>(null);
  showForm = signal(false);
  activeTab = signal<'active' | 'all'>('active');

  form: MedicationForm = this.emptyForm();
  pharmacyComuna = '';
  medicineSearch = '';

  // Computed lists
  activeMeds = computed(() => this.medications().filter((m) => m.active));
  allMeds = computed(() => this.medications());

  ngOnInit() {
    this.load();
    this.searchPharmacies();
  }

  private emptyForm(): MedicationForm {
    return {
      name: '',
      dosage: '',
      frequencyHours: 8,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      prescribedBy: '',
      reason: '',
      purchasePharmacy: '',
      purchaseAddress: '',
      purchaseCommune: '',
      medicineRegistration: '',
      medicineHolder: '',
      saleCondition: '',
    };
  }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (list) => {
        this.medications.set(list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar los medicamentos.');
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

  submit() {
    if (!this.form.name.trim() || !this.form.dosage.trim() || !this.form.startDate || !this.form.prescribedBy.trim()) {
      this.error.set('Nombre, dosis, fecha de inicio y médico son obligatorios.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const payload: Partial<Medication> = {
      name: this.form.name.trim(),
      dosage: this.form.dosage.trim(),
      frequencyHours: this.form.frequencyHours,
      startDate: this.form.startDate,
      endDate: this.form.endDate || undefined,
      prescribedBy: this.form.prescribedBy.trim(),
      reason: this.form.reason.trim(),
      purchasePharmacy: this.form.purchasePharmacy.trim() || undefined,
      purchaseAddress: this.form.purchaseAddress.trim() || undefined,
      purchaseCommune: this.form.purchaseCommune.trim() || undefined,
      medicineRegistration: this.form.medicineRegistration.trim() || undefined,
      medicineHolder: this.form.medicineHolder.trim() || undefined,
      saleCondition: this.form.saleCondition.trim() || undefined,
      active: true,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form = this.emptyForm();
        this.success.set(`Medicamento "${payload.name}" registrado correctamente.`);
        setTimeout(() => this.success.set(null), 4000);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Error al guardar el medicamento.');
      },
    });
  }

  deactivate(id: string) {
    if (!confirm('¿Marcar este medicamento como finalizado?')) return;
    const today = new Date().toISOString().slice(0, 10);
    this.svc.patch(id, { active: false, endDate: today }).subscribe({
      next: () => {
        this.success.set('Tratamiento finalizado.');
        setTimeout(() => this.success.set(null), 3000);
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Error al finalizar el tratamiento.');
        setTimeout(() => this.error.set(null), 3000);
      },
    });
  }

  deleteMed(id: string) {
    if (!confirm('¿Eliminar este medicamento? Esta acción no se puede deshacer.')) return;
    this.svc.delete(id).subscribe({
      next: () => {
        this.success.set('Medicamento eliminado.');
        setTimeout(() => this.success.set(null), 3000);
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Error al eliminar el medicamento.');
        setTimeout(() => this.error.set(null), 3000);
      },
    });
  }

  setTab(tab: 'active' | 'all') {
    this.activeTab.set(tab);
  }

  searchPharmacies() {
    this.loadingPharmacies.set(true);
    this.externalError.set(null);
    this.chile.pharmacies({
      mode: 'all',
      comuna: this.pharmacyComuna.trim() || undefined,
      limit: 12,
    }).subscribe({
      next: (res) => {
        this.pharmacies.set(res.items);
        this.pharmacySource.set(res.source);
        this.loadingPharmacies.set(false);
      },
      error: (err) => {
        this.loadingPharmacies.set(false);
        this.externalError.set(friendlyExternalError(err, 'No pudimos consultar farmacias MINSAL.'));
      },
    });
  }

  usePharmacy(item: Pharmacy) {
    this.form.purchasePharmacy = item.name;
    this.form.purchaseAddress = item.address;
    this.form.purchaseCommune = item.commune;
    this.showForm.set(true);
    this.success.set(`Farmacia "${item.name}" agregada al medicamento.`);
    setTimeout(() => this.success.set(null), 3500);
  }

  searchMedicineRegistry() {
    const search = this.medicineSearch.trim();
    if (search.length < 2) {
      this.externalError.set('Busca por al menos 2 caracteres.');
      return;
    }
    this.searchingMedicines.set(true);
    this.externalError.set(null);
    this.chile.medicines({ search, limit: 12 }).subscribe({
      next: (res) => {
        this.medicineResults.set(res.items);
        this.medicineSource.set(res.source);
        this.searchingMedicines.set(false);
      },
      error: (err) => {
        this.searchingMedicines.set(false);
        this.externalError.set(friendlyExternalError(err, 'No pudimos consultar el registro ISP.'));
      },
    });
  }

  useMedicine(item: MedicineRecord) {
    this.form.name = item.name;
    this.form.medicineRegistration = item.registration;
    this.form.medicineHolder = item.holder;
    this.form.saleCondition = item.saleCondition;
    this.showForm.set(true);
    this.success.set(`Medicamento "${item.name}" copiado al formulario.`);
    setTimeout(() => this.success.set(null), 3500);
  }

  get displayedMeds(): Medication[] {
    return this.activeTab() === 'active' ? this.activeMeds() : this.allMeds();
  }

  formatFrequency(hours: number): string {
    return `cada ${hours} hora${hours === 1 ? '' : 's'}`;
  }
}
