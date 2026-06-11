import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ChildService } from '../../core/services/child.service';
import { VaccineService } from '../../core/services/vaccine.service';
import { MeasurementService } from '../../core/services/measurement.service';
import { PhotoService, Photo } from '../../core/services/photo.service';
import { Child, Vaccine, Measurement } from '../../core/models/models';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  auth        = inject(AuthService);
  private childSvc   = inject(ChildService);
  private vaccineSvc = inject(VaccineService);
  private measureSvc = inject(MeasurementService);
  private photoSvc   = inject(PhotoService);

  child           = signal<Child | null>(null);
  pendingVaccines = signal<Vaccine[]>([]);
  lastMeasurement = signal<Measurement | null>(null);
  latestPhoto     = signal<Photo | null>(null);
  photoCount      = signal(0);
  loading         = signal(true);

  ngOnInit() {
    forkJoin({
      child:        this.childSvc.get().pipe(catchError(() => of(null))),
      vaccines:     this.vaccineSvc.list().pipe(catchError(() => of([]))),
      measurements: this.measureSvc.list().pipe(catchError(() => of([]))),
      photos:       this.photoSvc.list().pipe(catchError(() => of([]))),
    }).subscribe(({ child, vaccines, measurements, photos }) => {
      this.child.set(child);
      this.pendingVaccines.set(
        (vaccines as Vaccine[])
          .filter(v => v.status === 'pending')
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
          .slice(0, 3)
      );
      const sorted = (measurements as Measurement[]).sort((a, b) => b.date.localeCompare(a.date));
      this.lastMeasurement.set(sorted[0] ?? null);
      const sortedPhotos = (photos as Photo[]).sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
      });
      this.latestPhoto.set(sortedPhotos[0] ?? null);
      this.photoCount.set(sortedPhotos.length);
      this.loading.set(false);
    });
  }

  get ageText(): string {
    const child = this.child();
    if (!child?.birthDate) return '';
    const birth = new Date(child.birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 1) return 'Recién nacido';
    if (months < 24) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    const y = Math.floor(months / 12), r = months % 12;
    return r > 0 ? `${y} años y ${r} meses` : `${y} años`;
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get latestPhotoLabel(): string {
    const photo = this.latestPhoto();
    if (!photo) return 'Fotos';
    const date = new Date(photo.date + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  }
}
