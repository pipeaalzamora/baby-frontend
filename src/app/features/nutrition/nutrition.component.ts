import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { RecipeService } from '../../core/services/recipe.service';
import { Recipe, FoodIntroduction, RecipeIngredient } from '../../core/models/models';
import { forkJoin } from 'rxjs';

interface RecipeForm {
  name: string;
  stage: string;
  texture: string;
  prepTimeMin: number | null;
  ingredients: RecipeIngredient[];
  steps: string[];
}

interface IntroForm {
  foodName: string;
  date: string;
  reaction: 'none' | 'mild' | 'moderate' | 'severe';
  notes: string;
  accepted: boolean;
}

@Component({
  selector: 'app-nutrition',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  templateUrl: './nutrition.component.html',
  styleUrls: ['./nutrition.component.scss'],
})
export class NutritionComponent implements OnInit {
  private svc = inject(RecipeService);

  activeTab = signal<'guide' | 'recipes' | 'introductions'>('guide');

  recipes       = signal<Recipe[]>([]);
  introductions = signal<FoodIntroduction[]>([]);
  loading       = signal(false);
  saving        = signal(false);
  error         = signal<string | null>(null);
  success       = signal<string | null>(null);
  showRecipeForm = signal(false);
  showIntroForm  = signal(false);

  readonly stageGuide = [
    {
      stage: '0-6m',
      label: '0-6 meses',
      icon: '🍼',
      desc: 'Lactancia materna exclusiva o fórmula. No introducir sólidos.',
      foods: ['Leche materna', 'Fórmula infantil'],
    },
    {
      stage: '6m',
      label: '6 meses',
      icon: '🥣',
      desc: 'Inicio de papillas. Introducir un alimento a la vez, esperar 3-5 días.',
      foods: ['Puré de zanahoria', 'Puré de papa', 'Puré de zapallo', 'Cereal de arroz'],
    },
    {
      stage: '8m',
      label: '7-8 meses',
      icon: '🥦',
      desc: 'Texturas más gruesas. Proteínas suaves.',
      foods: ['Pollo desmenuzado', 'Lentejas', 'Yogur natural', 'Frutas blandas'],
    },
    {
      stage: '10m',
      label: '9-12 meses',
      icon: '🍳',
      desc: 'Trozos pequeños. Casi toda la familia.',
      foods: ['Huevo bien cocido', 'Pescado blanco', 'Pasta pequeña', 'Pan blando'],
    },
    {
      stage: '12m+',
      label: '12+ meses',
      icon: '🍽️',
      desc: 'Dieta familiar adaptada. Evitar sal, azúcar y miel.',
      foods: ['Comida familiar sin sal', 'Frutas enteras', 'Verduras variadas', 'Legumbres'],
    },
  ];

  readonly stageOptions = ['0-6m', '6m', '8m', '10m', '12m+'];
  readonly textureOptions = ['Líquido', 'Puré fino', 'Puré grueso', 'Triturado', 'Trozos pequeños', 'Sólido blando'];

  recipeForm: RecipeForm = this.emptyRecipeForm();
  introForm: IntroForm   = this.emptyIntroForm();

  ngOnInit() {
    this.loadAll();
  }

  setTab(tab: 'guide' | 'recipes' | 'introductions') {
    this.activeTab.set(tab);
    this.error.set(null);
  }

  private loadAll() {
    this.loading.set(true);
    forkJoin({
      recipes: this.svc.listRecipes(),
      introductions: this.svc.listIntroductions(),
    }).subscribe({
      next: ({ recipes, introductions }) => {
        this.recipes.set(recipes);
        this.introductions.set(introductions.sort((a, b) => b.date.localeCompare(a.date)));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Error al cargar datos de nutrición.');
        this.loading.set(false);
      },
    });
  }

  // ─── Recipe form ────────────────────────────────────────────────────────────

  toggleRecipeForm() {
    this.showRecipeForm.update(v => !v);
    if (!this.showRecipeForm()) {
      this.recipeForm = this.emptyRecipeForm();
    }
    this.error.set(null);
  }

  addIngredient() {
    this.recipeForm.ingredients.push({ name: '', amount: '' });
  }

  removeIngredient(i: number) {
    this.recipeForm.ingredients.splice(i, 1);
  }

  addStep() {
    this.recipeForm.steps.push('');
  }

  removeStep(i: number) {
    this.recipeForm.steps.splice(i, 1);
  }

  trackByIndex(index: number) {
    return index;
  }

  submitRecipe() {
    if (!this.recipeForm.name.trim()) {
      this.error.set('El nombre de la receta es obligatorio.');
      return;
    }
    if (!this.recipeForm.stage) {
      this.error.set('Selecciona una etapa.');
      return;
    }
    if (this.recipeForm.prepTimeMin == null || this.recipeForm.prepTimeMin <= 0) {
      this.error.set('El tiempo de preparación debe ser mayor a 0.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.svc.createRecipe({
      name: this.recipeForm.name.trim(),
      stage: this.recipeForm.stage,
      texture: this.recipeForm.texture,
      prepTimeMin: this.recipeForm.prepTimeMin,
      ingredients: this.recipeForm.ingredients.filter(i => i.name.trim()),
      steps: this.recipeForm.steps.filter(s => s.trim()),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showRecipeForm.set(false);
        this.recipeForm = this.emptyRecipeForm();
        this.success.set('Receta creada correctamente.');
        setTimeout(() => this.success.set(null), 4000);
        this.loadAll();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Error al guardar la receta.');
      },
    });
  }

  // ─── Intro form ─────────────────────────────────────────────────────────────

  toggleIntroForm() {
    this.showIntroForm.update(v => !v);
    if (!this.showIntroForm()) {
      this.introForm = this.emptyIntroForm();
    }
    this.error.set(null);
  }

  submitIntro() {
    if (!this.introForm.foodName.trim()) {
      this.error.set('El nombre del alimento es obligatorio.');
      return;
    }
    if (!this.introForm.date) {
      this.error.set('La fecha es obligatoria.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    this.svc.createIntroduction({
      foodName: this.introForm.foodName.trim(),
      date: this.introForm.date,
      reaction: this.introForm.reaction,
      notes: this.introForm.notes.trim() || undefined,
      accepted: this.introForm.accepted,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showIntroForm.set(false);
        this.introForm = this.emptyIntroForm();
        this.success.set('Introducción registrada correctamente.');
        setTimeout(() => this.success.set(null), 4000);
        this.loadAll();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error ?? 'Error al guardar la introducción.');
      },
    });
  }

  // ─── Favorite ───────────────────────────────────────────────────────────────

  toggleFavorite(recipe: Recipe) {
    this.svc.toggleFavorite(recipe.id, !recipe.isFavorite).subscribe({
      next: (updated) => {
        this.recipes.update(list =>
          list.map(r => r.id === updated.id ? updated : r)
        );
      },
      error: () => {
        this.error.set('Error al actualizar favorito.');
        setTimeout(() => this.error.set(null), 3000);
      },
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  reactionLabel(r: string): string {
    const map: Record<string, string> = {
      none: 'Sin reacción',
      mild: 'Leve',
      moderate: 'Moderada',
      severe: 'Severa',
    };
    return map[r] ?? r;
  }

  private emptyRecipeForm(): RecipeForm {
    return {
      name: '',
      stage: '',
      texture: '',
      prepTimeMin: null,
      ingredients: [{ name: '', amount: '' }],
      steps: [''],
    };
  }

  private emptyIntroForm(): IntroForm {
    return {
      foodName: '',
      date: new Date().toISOString().slice(0, 10),
      reaction: 'none',
      notes: '',
      accepted: true,
    };
  }
}
