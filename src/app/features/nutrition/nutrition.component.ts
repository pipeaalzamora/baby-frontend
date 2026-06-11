import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { ExternalRecipe, RecipeSourceInfo, RecipeService } from '../../core/services/recipe.service';
import { Recipe, FoodIntroduction, RecipeIngredient } from '../../core/models/models';
import { forkJoin } from 'rxjs';
import { ChildService } from '../../core/services/child.service';

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
  private childSvc = inject(ChildService);

  activeTab = signal<'guide' | 'recipes' | 'introductions'>('guide');

  recipes       = signal<Recipe[]>([]);
  introductions = signal<FoodIntroduction[]>([]);
  loading       = signal(false);
  saving        = signal(false);
  error         = signal<string | null>(null);
  success       = signal<string | null>(null);
  showRecipeForm = signal(false);
  showIntroForm  = signal(false);
  externalRecipes = signal<ExternalRecipe[]>([]);
  externalSource  = signal<RecipeSourceInfo | null>(null);
  externalLoading = signal(false);
  externalSearched = signal(false);
  externalError   = signal<string | null>(null);

  externalQuery = 'papilla';
  externalAgeMonths = 8;

  readonly childAgeMonths = computed(() => {
    const birthDate = this.childSvc.activeChild()?.birthDate;
    return birthDate ? this.monthsSinceBirth(birthDate) : null;
  });

  readonly stageGuide = [
    {
      stage: '0-6m',
      label: '0-6 meses',
      icon: '🍼',
      desc: 'Chile Crece Contigo refuerza lactancia materna exclusiva hasta los 6 meses; si no es posible, usar fórmula indicada por profesional.',
      foods: ['Leche materna', 'Fórmula indicada', 'Sin agua, jugos ni sólidos'],
    },
    {
      stage: '6m',
      label: '6 meses',
      icon: '🥣',
      desc: 'Inicio de alimentación complementaria, manteniendo lactancia. Registrar tolerancia y avanzar texturas según indicación del control.',
      foods: ['Verduras cocidas', 'Frutas molidas', 'Cereales', 'Carnes o legumbres bien molidas'],
    },
    {
      stage: '8m',
      label: '7-8 meses',
      icon: '🥦',
      desc: 'Progresar a texturas más gruesas y alimentos ricos en hierro, cuidando tamaño y consistencia.',
      foods: ['Pollo o pavo molido', 'Legumbres pasadas', 'Pescado bien cocido', 'Frutas blandas'],
    },
    {
      stage: '10m',
      label: '9-12 meses',
      icon: '🍳',
      desc: 'Aumentar variedad, promover alimentación familiar adaptada y evitar riesgo de atragantamiento.',
      foods: ['Huevo bien cocido', 'Verduras en trozos blandos', 'Pasta pequeña', 'Pan blando'],
    },
    {
      stage: '12m+',
      label: '12+ meses',
      icon: '🍽️',
      desc: 'Dieta familiar saludable adaptada: baja en sal y azúcar, con agua como bebida principal.',
      foods: ['Comida familiar adaptada', 'Frutas', 'Verduras', 'Legumbres'],
    },
  ];

  readonly nutritionSources = [
    {
      name: 'Chile Crece Contigo - La lactancia: El mejor alimento',
      url: 'https://www.crececontigo.gob.cl/tema/la-lactancia-el-mejor-alimento/',
      note: 'Lactancia exclusiva hasta 6 meses y complementada con otros alimentos hasta al menos 2 años.',
    },
    {
      name: 'Chile Crece Contigo - Recomendaciones de lactancia materna',
      url: 'https://www.crececontigo.gob.cl/tema/recomendaciones-de-lactancia-materna/',
      note: 'Material de apoyo para familias y cuidadores.',
    },
    {
      name: 'Salud Responde MINSAL',
      url: 'https://saludresponde.minsal.cl/',
      note: 'Orientación sanitaria oficial; no reemplaza el control pediátrico.',
    },
  ];

  readonly stageOptions = ['0-6m', '6m', '8m', '10m', '12m+'];
  readonly textureOptions = ['Líquido', 'Puré fino', 'Puré grueso', 'Triturado', 'Trozos pequeños', 'Sólido blando'];

  recipeForm: RecipeForm = this.emptyRecipeForm();
  introForm: IntroForm   = this.emptyIntroForm();

  ngOnInit() {
    const currentAge = this.childAgeMonths();
    if (currentAge !== null) {
      this.externalAgeMonths = Math.max(0, Math.min(72, currentAge));
    }
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

  // ─── External recipes ──────────────────────────────────────────────────────

  searchExternalRecipes() {
    const query = this.externalQuery.trim();
    if (query.length < 2) {
      this.externalError.set('Escribe al menos 2 caracteres para buscar.');
      return;
    }
    if (this.externalAgeMonths < 6) {
      this.externalRecipes.set([]);
      this.externalSource.set(null);
      this.externalSearched.set(true);
      this.externalError.set('Antes de los 6 meses no se muestran recetas de sólidos.');
      return;
    }

    this.externalLoading.set(true);
    this.externalError.set(null);
    this.externalSearched.set(true);
    this.svc.searchExternalRecipes(query, this.externalAgeMonths).subscribe({
      next: (response) => {
        this.externalRecipes.set(response.items ?? []);
        this.externalSource.set(response.source);
        this.externalLoading.set(false);
        if ((response.items ?? []).length === 0) {
          this.externalError.set('No encontré papillas compatibles con esa edad. Prueba con zanahoria, papa, zapallo, pollo, lentejas, pescado, avena o manzana.');
        }
      },
      error: (err) => {
        this.externalLoading.set(false);
        this.externalError.set(err?.error?.error ?? 'No se pudo buscar recetas externas.');
      },
    });
  }

  useExternalRecipe(recipe: ExternalRecipe) {
    this.recipeForm = {
      name: recipe.name,
      stage: recipe.stage,
      texture: recipe.texture,
      prepTimeMin: recipe.prepTimeMin,
      ingredients: recipe.ingredients.length > 0 ? recipe.ingredients.map(i => ({ ...i })) : [{ name: '', amount: '' }],
      steps: recipe.steps.length > 0 ? [...recipe.steps] : [''],
    };
    this.showRecipeForm.set(true);
    this.success.set('Receta externa copiada como base. Revisa y adapta antes de guardar.');
    setTimeout(() => this.success.set(null), 5000);
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

  ageLabel(months: number | null): string {
    if (months === null) {
      return 'Edad no disponible';
    }
    if (months < 12) {
      return `${months} meses`;
    }
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (rest === 0) {
      return years === 1 ? '1 año' : `${years} años`;
    }
    return years === 1 ? `1 año ${rest} meses` : `${years} años ${rest} meses`;
  }

  setExternalAge(months: number) {
    this.externalAgeMonths = Math.max(0, Math.min(72, months));
  }

  private monthsSinceBirth(birthDate: string): number | null {
    const birth = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) {
      return null;
    }
    const today = new Date();
    let months = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
    if (today.getDate() < birth.getDate()) {
      months -= 1;
    }
    return Math.max(0, months);
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
