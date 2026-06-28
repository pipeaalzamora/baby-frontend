import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Child } from '../../core/models/models';
import { ChildProfileInput, ChildService } from '../../core/services/child.service';
import { S3ObjectReference, UploadProgress } from '../../core/services/s3-upload.service';
import { VaccineService } from '../../core/services/vaccine.service';
import { BillingService } from '../../core/services/billing.service';

type EditorMode = 'edit' | 'create';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private childSvc = inject(ChildService);
  private vaccineSvc = inject(VaccineService);
  private router = inject(Router);
  private billing = inject(BillingService);

  children = this.childSvc.children;
  activeChild = this.childSvc.activeChild;
  /** Estado premium para mostrar la insignia en el encabezado. */
  premium = this.billing.premium;

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  mode = signal<EditorMode>('edit');
  editingChildId = signal<string | null>(null);
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  uploadProgress = signal(0);

  name = '';
  birthDate = '';
  gender: 'M' | 'F' = 'M';
  bloodType = '';
  photoUrl = '';
  birthWeightKg = 3.2;
  birthHeightCm = 50;

  ngOnInit() {
    this.loadChildren();
  }

  loadChildren() {
    this.loading.set(true);
    this.childSvc.list().subscribe({
      next: (children) => {
        this.loading.set(false);
        const child = this.activeChild() ?? children[0] ?? null;
        if (!child) {
          this.router.navigate(['/setup']);
          return;
        }
        this.populateForm(child);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No pudimos cargar los perfiles.');
      },
    });
  }

  selectChild(child: Child) {
    this.error.set(null);
    this.success.set(null);
    this.childSvc.select(child.id).subscribe({
      next: (selected) => {
        this.populateForm(selected);
        this.success.set(`${selected.name} quedó como perfil activo.`);
        setTimeout(() => this.success.set(null), 3000);
      },
      error: () => this.error.set('No pudimos cambiar el perfil activo.'),
    });
  }

  startCreate() {
    this.mode.set('create');
    this.editingChildId.set(null);
    this.name = '';
    this.birthDate = '';
    this.gender = 'M';
    this.bloodType = '';
    this.photoUrl = '';
    this.birthWeightKg = 3.2;
    this.birthHeightCm = 50;
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.uploadProgress.set(0);
    this.error.set(null);
    this.success.set(null);
  }

  cancelCreate() {
    const child = this.activeChild() ?? this.children()[0] ?? null;
    if (child) {
      this.populateForm(child);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);

    if (!file) {
      this.previewUrl.set(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => this.previewUrl.set((e.target?.result as string) ?? null);
    reader.readAsDataURL(file);
  }

  async save() {
    if (!this.name.trim() || !this.birthDate) {
      this.error.set('Nombre y fecha de nacimiento son obligatorios.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.uploadProgress.set(0);

    try {
      const file = this.selectedFile();

      const basePayload: ChildProfileInput = {
        name: this.name.trim(),
        birthDate: this.birthDate,
        gender: this.gender,
        bloodType: this.bloodType || undefined,
        birthWeightKg: Number(this.birthWeightKg) || 0,
        birthHeightCm: Number(this.birthHeightCm) || 0,
      };

      const creating = this.mode() === 'create';
      let child: Child;
      if (creating) {
        child = await firstValueFrom(this.childSvc.create(basePayload));
        await this.seedVaccines();
        if (file) {
          const photo = await this.uploadProfileFile(file, child.id);
          child = await firstValueFrom(this.childSvc.update(child.id, {
            ...basePayload,
            ...this.photoPayload(photo),
          }));
        }
      } else {
        let photoPayload: ChildProfileInput = {};
        if (file) {
          const photo = await this.uploadProfileFile(file, this.editingChildId()!);
          photoPayload = this.photoPayload(photo);
        }

        child = await firstValueFrom(this.childSvc.update(this.editingChildId()!, {
          ...basePayload,
          ...photoPayload,
        }));
      }

      this.populateForm(child);
      await firstValueFrom(this.childSvc.list());
      this.success.set(creating ? 'Perfil creado correctamente.' : 'Perfil actualizado.');
      setTimeout(() => this.success.set(null), 3500);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No pudimos guardar el perfil.');
    } finally {
      this.saving.set(false);
    }
  }

  ageFor(child: Child | null): string {
    if (!child?.birthDate) return 'Sin edad';

    const birth = new Date(child.birthDate + 'T00:00:00');
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) {
      months -= 1;
    }
    if (months < 1) return 'Recién nacido';
    if (months < 24) return `${months} ${months === 1 ? 'mes' : 'meses'}`;

    const years = Math.floor(months / 12);
    const rest = months % 12;
    return rest > 0 ? `${years} años y ${rest} meses` : `${years} años`;
  }

  get maxDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private populateForm(child: Child) {
    this.mode.set('edit');
    this.editingChildId.set(child.id);
    this.name = child.name;
    this.birthDate = child.birthDate;
    this.gender = child.gender;
    this.bloodType = child.bloodType ?? '';
    this.photoUrl = child.photoUrl ?? '';
    this.birthWeightKg = child.birthWeightKg || 0;
    this.birthHeightCm = child.birthHeightCm || 0;
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.uploadProgress.set(0);
  }

  private uploadProfileFile(file: File, childId: string): Promise<S3ObjectReference> {
    return firstValueFrom(
      this.childSvc.uploadProfilePhoto(
        file,
        childId,
        (progress: UploadProgress) => {
          this.uploadProgress.set(progress.progress);
          if (progress.error) {
            this.error.set(progress.error);
          }
        },
      ),
    );
  }

  private photoPayload(photo: S3ObjectReference): ChildProfileInput {
    return {
      photoProvider: 's3',
      photoBucket: photo.bucket,
      photoKey: photo.key,
      photoMimeType: photo.contentType,
      photoSize: photo.sizeBytes,
    };
  }

  private async seedVaccines() {
    try {
      await firstValueFrom(this.vaccineSvc.seedLocal());
    } catch {
      // El perfil no debe fallar si la semilla PNI no se puede crear en ese momento.
    }
  }
}
