import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChildService } from '../../core/services/child.service';
import { AuthService } from '../../core/services/auth.service';
import { VaccineService } from '../../core/services/vaccine.service';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
})
export class SetupComponent implements OnInit {
  private childSvc = inject(ChildService);
  private vaccineSvc = inject(VaccineService);
  private auth     = inject(AuthService);
  private router   = inject(Router);

  name          = '';
  birthDate     = '';
  gender: 'M' | 'F' = 'M';
  birthWeightKg = 3.2;
  birthHeightCm = 50;
  bloodType     = '';

  saving      = signal(false);
  errorMsg    = signal<string | null>(null);

  ngOnInit() {
    this.childSvc.get().subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => { /* 404 = no tiene bebé, quedarse aquí */ },
    });
  }

  save() {
    if (!this.name.trim() || !this.birthDate) {
      this.errorMsg.set('Nombre y fecha de nacimiento son obligatorios.');
      return;
    }

    this.saving.set(true);
    this.errorMsg.set(null);

    this.childSvc.upsert({
      name:          this.name.trim(),
      birthDate:     this.birthDate,
      gender:        this.gender,
      birthWeightKg: this.birthWeightKg,
      birthHeightCm: this.birthHeightCm,
      bloodType:     this.bloodType || undefined,
    }).subscribe({
      next: (child) => {
        this.auth.updateChildId(child.id);
        this.vaccineSvc.seedLocal().subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: () => this.router.navigate(['/dashboard']),
        });
      },
      error: () => {
        this.saving.set(false);
        this.errorMsg.set('Error al guardar. Intenta de nuevo.');
      },
    });
  }

  get maxDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
