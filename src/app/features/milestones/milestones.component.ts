import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DevelopmentAdvice, MilestoneService, Milestone, MilestoneCategory } from '../../core/services/milestone.service';

interface MilestoneCategoryConfig {
  label: string;
  icon: string;
  color: string;
}

interface MilestoneForm {
  category: MilestoneCategory;
  title: string;
  description: string;
  date: string;
}

@Component({
  selector: 'app-milestones',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './milestones.component.html',
  styleUrls: ['./milestones.component.scss'],
})
export class MilestonesComponent implements OnInit {
  private svc = inject(MilestoneService);

  milestones = signal<Milestone[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  showForm = signal(false);
  advice = signal<DevelopmentAdvice | null>(null);
  adviceLoading = signal(false);
  adviceAgeMonths = 6;

  activeCategory = signal<'all' | MilestoneCategory>('all');

  form: MilestoneForm = this.emptyForm();

  readonly categoryConfig: Record<MilestoneCategory, MilestoneCategoryConfig> = {
    motor:     { label: 'Motor',        icon: '🏃', color: '#0ea5e9' },
    social:    { label: 'Social',       icon: '👥', color: '#ec4899' },
    language:  { label: 'Lenguaje',     icon: '🗣️', color: '#8b5cf6' },
    cognitive: { label: 'Cognitivo',    icon: '🧠', color: '#f59e0b' },
    feeding:   { label: 'Alimentación', icon: '🥄', color: '#10b981' },
  };

  readonly categories: MilestoneCategory[] = ['motor', 'social', 'language', 'cognitive', 'feeding'];

  readonly filteredMilestones = computed(() => {
    const cat = this.activeCategory();
    const all = this.milestones();
    return cat === 'all' ? all : all.filter(m => m.category === cat);
  });

  countByCategory(cat: MilestoneCategory): number {
    return this.milestones().filter(m => m.category === cat).length;
  }

  ngOnInit() {
    this.load();
    this.loadAdvice();
  }

  private emptyForm(): MilestoneForm {
    return {
      category: 'motor',
      title: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
    };
  }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (list) => {
        this.milestones.set(list.sort((a, b) => b.date.localeCompare(a.date)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar los hitos.');
        this.loading.set(false);
      },
    });
  }

  toggleForm() {
    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.form = this.emptyForm();
      this.error.set(null);
    }
  }

  setCategory(cat: 'all' | MilestoneCategory) {
    this.activeCategory.set(cat);
  }

  loadAdvice(ageMonths?: number) {
    this.adviceLoading.set(true);
    this.svc.advice(ageMonths).subscribe({
      next: (advice) => {
        this.advice.set(advice);
        this.adviceAgeMonths = advice.ageMonths;
        this.adviceLoading.set(false);
      },
      error: () => {
        this.adviceLoading.set(false);
        this.error.set('Error al cargar consejos por edad.');
      },
    });
  }

  selectAdviceAge(months: number) {
    this.adviceAgeMonths = Math.max(0, Math.min(60, months));
    this.loadAdvice(this.adviceAgeMonths);
  }

  submit() {
    if (!this.form.title.trim() || !this.form.date) {
      this.error.set('El título y la fecha son obligatorios.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const payload: Partial<Milestone> = {
      category:    this.form.category,
      title:       this.form.title.trim(),
      description: this.form.description.trim(),
      date:        this.form.date,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form = this.emptyForm();
        this.success.set('¡Hito registrado con éxito!');
        setTimeout(() => this.success.set(null), 4000);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Error al guardar el hito.');
      },
    });
  }

  deleteMilestone(id: string) {
    if (!confirm('¿Eliminar este hito?')) return;
    this.svc.delete(id).subscribe({
      next: () => {
        this.success.set('Hito eliminado.');
        setTimeout(() => this.success.set(null), 3000);
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Error al eliminar.');
        setTimeout(() => this.error.set(null), 3000);
      },
    });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
  }
}
