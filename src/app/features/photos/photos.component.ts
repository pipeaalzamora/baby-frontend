import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PhotoService, Photo } from '../../core/services/photo.service';
import { UploadProgress } from '../../core/services/s3-upload.service';

interface PhotosByMonth {
  label: string;   // "Enero 2025"
  photos: Photo[];
}

@Component({
  selector: 'app-photos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './photos.component.html',
  styleUrls: ['./photos.component.scss'],
})
export class PhotosComponent implements OnInit {
  private photoService = inject(PhotoService);

  // ── State signals ─────────────────────────────────────────────────────────
  photos        = signal<Photo[]>([]);
  loading       = signal(true);
  saving        = signal(false);
  error         = signal<string | null>(null);
  success       = signal<string | null>(null);
  uploadProgress = signal(0);
  showUploadForm = signal(false);
  selectedFile   = signal<File | null>(null);
  previewUrl     = signal<string | null>(null);
  lightboxPhoto  = signal<Photo | null>(null);

  // ── Form fields ───────────────────────────────────────────────────────────
  caption   = '';
  date      = new Date().toISOString().slice(0, 10);
  tagsInput = '';

  // ── Computed ──────────────────────────────────────────────────────────────
  photosByDate = computed<PhotosByMonth[]>(() => {
    const all = this.photos();
    if (!all.length) return [];

    const map = new Map<string, Photo[]>();

    for (const photo of all) {
      const d = new Date(photo.date + 'T00:00:00');
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(photo);
    }

    // Sort keys descending (most recent first)
    const sorted = Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));

    const MONTHS = [
      'Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
    ];

    return sorted.map(([key, photos]) => {
      const [year, month] = key.split('-').map(Number);
      return { label: `${MONTHS[month - 1]} ${year}`, photos };
    });
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.photoService.list().subscribe({
      next: (list) => {
        this.photos.set(list.sort((a, b) => b.date.localeCompare(a.date)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar las fotos.');
        this.loading.set(false);
      },
    });
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
    reader.onload = (e) => this.previewUrl.set(e.target?.result as string ?? null);
    reader.readAsDataURL(file);
  }

  upload() {
    const file = this.selectedFile();
    if (!file) return;

    this.saving.set(true);
    this.error.set(null);
    this.uploadProgress.set(0);

    const tags = this.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    this.photoService
      .upload(file, this.date, this.caption, tags, (p: UploadProgress) => {
        this.uploadProgress.set(p.progress);
        if (p.error) {
          this.error.set(p.error);
          this.saving.set(false);
        }
      })
      .subscribe({
        next: (photo) => {
          this.photos.update((list) => [photo, ...list]);
          this.saving.set(false);
          this.showUploadForm.set(false);
          this.resetForm();
          this.success.set('Foto subida correctamente 📷');
          setTimeout(() => this.success.set(null), 4000);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.message ?? 'Error al subir la foto.');
        },
      });
  }

  deletePhoto(id: string) {
    this.photoService.delete(id).subscribe({
      next: () => {
        this.photos.update((list) => list.filter((p) => p.id !== id));
        if (this.lightboxPhoto()?.id === id) this.closeLightbox();
        this.success.set('Foto eliminada.');
        setTimeout(() => this.success.set(null), 3000);
      },
      error: () => this.error.set('Error al eliminar la foto.'),
    });
  }

  openLightbox(photo: Photo) {
    this.lightboxPhoto.set(photo);
  }

  closeLightbox() {
    this.lightboxPhoto.set(null);
  }

  openUploadForm() {
    this.showUploadForm.set(true);
    this.resetForm();
  }

  cancelUpload() {
    this.showUploadForm.set(false);
    this.resetForm();
  }

  private resetForm() {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.uploadProgress.set(0);
    this.caption   = '';
    this.date      = new Date().toISOString().slice(0, 10);
    this.tagsInput = '';
    this.error.set(null);
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
