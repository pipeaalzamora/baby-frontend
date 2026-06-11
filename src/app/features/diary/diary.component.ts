import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DiaryService, DiaryEntry, DiaryType } from '../../core/services/diary.service';

type TabType = 'all' | DiaryType;

interface TypeConfig {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

interface DiaryForm {
  type: DiaryType;
  date: string;
  notes: string;
  // feeding
  feedingMode: 'breast' | 'bottle' | 'food';
  breast: string;
  bottleMl: number | null;
  food: string;
  // sleep
  sleepStart: string;
  sleepEnd: string;
  sleepQuality: string;
  // diaper
  diaperType: string;
  diaperColor: string;
  // mood
  moodLevel: number;
  moodDesc: string;
  // note
  noteText: string;
}

@Component({
  selector: 'app-diary',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './diary.component.html',
  styleUrls: ['./diary.component.scss'],
})
export class DiaryComponent implements OnInit {
  private svc = inject(DiaryService);

  entries    = signal<DiaryEntry[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  error      = signal<string | null>(null);
  success    = signal<string | null>(null);
  showForm   = signal(false);
  activeTab  = signal<TabType>('all');
  selectedType = signal<DiaryType>('feeding');

  readonly typeConfig: Record<DiaryType, TypeConfig> = {
    feeding: { label: 'Lactancia', emoji: '🍼', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  border: 'rgba(14,165,233,0.25)' },
    sleep:   { label: 'Sueño',     emoji: '😴', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
    diaper:  { label: 'Pañal',     emoji: '👶', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
    mood:    { label: 'Humor',     emoji: '😊', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
    note:    { label: 'Nota',      emoji: '📝', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)' },
  };

  readonly moodEmojis = ['😢', '😕', '😐', '🙂', '😄'];

  form: DiaryForm = this.emptyForm();

  // ─── Computed ──────────────────────────────────────────────────────────────

  filteredEntries = computed(() => {
    const tab = this.activeTab();
    const all = this.entries();
    return tab === 'all' ? all : all.filter(e => e.type === tab);
  });

  groupedByDate = computed(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const entry of this.filteredEntries()) {
      const day = entry.date.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(entry);
    }
    // Sort days descending
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  });

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit() {
    this.load();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private emptyForm(): DiaryForm {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDatetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return {
      type: 'feeding',
      date: localDatetime,
      notes: '',
      feedingMode: 'breast',
      breast: 'both',
      bottleMl: null,
      food: '',
      sleepStart: '',
      sleepEnd: '',
      sleepQuality: 'good',
      diaperType: 'wet',
      diaperColor: '',
      moodLevel: 3,
      moodDesc: '',
      noteText: '',
    };
  }

  formatDateLabel(dateStr: string): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const d = new Date(dateStr + 'T12:00:00');
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const yestStr  = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;

    if (dateStr === todayStr) return 'Hoy';
    if (dateStr === yestStr)  return 'Ayer';

    return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  /** Type-safe helper para acceder a typeConfig desde el template */
  getTypeConfig(type: string) {
    return this.typeConfig[type as DiaryType] ?? this.typeConfig['note'];
  }

  /** Label del tab activo para el empty state */
  activeTabLabel(): string {
    const tab = this.activeTab();
    if (tab === 'all') return '';
    return this.typeConfig[tab as DiaryType]?.label ?? '';
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }

  getSummary(entry: DiaryEntry): string {
    const d = entry.data;
    switch (entry.type) {
      case 'feeding':
        const parts: string[] = [];
        if (d['breast']) parts.push(`Pecho: ${d['breast'] === 'left' ? 'izquierdo' : d['breast'] === 'right' ? 'derecho' : 'ambos'}`);
        if (d['bottle']) parts.push(`Biberón: ${d['bottle']} ml`);
        if (d['food'])   parts.push(`Sólido: ${d['food']}`);
        return parts.join(' · ') || 'Alimentación';
      case 'sleep':
        const from = d['startTime'] ? d['startTime'].slice(11,16) : '';
        const to   = d['endTime']   ? d['endTime'].slice(11,16)   : '';
        const qual = d['quality'] === 'good' ? 'Bueno' : d['quality'] === 'fair' ? 'Regular' : d['quality'] === 'poor' ? 'Malo' : '';
        return [from && to ? `${from} – ${to}` : '', qual].filter(Boolean).join(' · ') || 'Sueño';
      case 'diaper':
        const dtype = d['type'] === 'wet' ? 'Mojado' : d['type'] === 'dirty' ? 'Sucio' : 'Mixto';
        return d['color'] ? `${dtype} · ${d['color']}` : dtype;
      case 'mood':
        const lvl = d['level'] ?? 3;
        return `${this.moodEmojis[lvl - 1]} Nivel ${lvl}${d['description'] ? ' · ' + d['description'] : ''}`;
      case 'note':
        return d['text'] ? (d['text'] as string).slice(0, 80) : 'Nota';
    }
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (list) => {
        this.entries.set(list.sort((a, b) => b.date.localeCompare(a.date)));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el diario.');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: TabType) {
    this.activeTab.set(tab);
  }

  setType(type: DiaryType) {
    this.selectedType.set(type);
    this.form.type = type;
  }

  toggleForm() {
    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.form = this.emptyForm();
      this.error.set(null);
    }
  }

  submit() {
    if (!this.form.date) {
      this.error.set('La fecha es obligatoria.');
      return;
    }

    const type = this.form.type;
    let data: Record<string, any> = {};

    switch (type) {
      case 'feeding':
        if (this.form.feedingMode === 'breast') {
          data = { breast: this.form.breast };
        } else if (this.form.feedingMode === 'bottle') {
          data = { bottle: this.form.bottleMl ?? 0 };
        } else {
          data = { food: this.form.food };
        }
        break;
      case 'sleep':
        data = {
          startTime: this.form.sleepStart || undefined,
          endTime:   this.form.sleepEnd   || undefined,
          quality:   this.form.sleepQuality,
        };
        break;
      case 'diaper':
        data = {
          type:  this.form.diaperType,
          color: this.form.diaperColor || undefined,
        };
        break;
      case 'mood':
        data = {
          level:       this.form.moodLevel,
          description: this.form.moodDesc || undefined,
        };
        break;
      case 'note':
        if (!this.form.noteText.trim()) {
          this.error.set('El texto de la nota es obligatorio.');
          return;
        }
        data = { text: this.form.noteText.trim() };
        break;
    }

    this.saving.set(true);
    this.error.set(null);

    const payload: Partial<DiaryEntry> = {
      type,
      date:  this.form.date,
      data,
      notes: this.form.notes.trim() || undefined,
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form = this.emptyForm();
        this.success.set('Entrada añadida al diario.');
        setTimeout(() => this.success.set(null), 4000);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Error al guardar.');
      },
    });
  }

  delete(id: string) {
    if (!confirm('¿Eliminar esta entrada del diario?')) return;
    this.svc.delete(id).subscribe({
      next: () => {
        this.success.set('Entrada eliminada.');
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
