import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Recipe, FoodIntroduction, RecipeIngredient } from '../models/models';

export interface RecipeSourceInfo {
  name: string;
  url: string;
  fetchedAt: string;
  disclaimer?: string;
}

export interface ExternalRecipe {
  id: string;
  name: string;
  provider?: string;
  category?: string;
  area?: string;
  imageUrl?: string;
  videoUrl?: string;
  sourceUrl?: string;
  minAgeMonths: number;
  ageLabel: string;
  stage: string;
  texture: string;
  prepTimeMin: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  warnings: string[];
  tags: string[];
}

export interface ExternalRecipeResponse {
  source: RecipeSourceInfo;
  query: string;
  translatedQuery?: string;
  ageMonths: number;
  ageLabel: string;
  mode: string;
  count: number;
  items: ExternalRecipe[];
}

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/recipes`;

  listRecipes() {
    return this.http.get<Recipe[]>(this.base);
  }

  createRecipe(data: Partial<Recipe>) {
    return this.http.post<Recipe>(this.base, data);
  }

  toggleFavorite(id: string, isFavorite: boolean) {
    return this.http.patch<Recipe>(`${this.base}/${id}/favorite`, { isFavorite });
  }

  searchExternalRecipes(query: string, ageMonths: number, limit = 8) {
    const params = new HttpParams()
      .set('q', query)
      .set('ageMonths', String(ageMonths))
      .set('limit', String(limit));
    return this.http.get<ExternalRecipeResponse>(`${this.base}/search-external`, { params });
  }

  listIntroductions() {
    return this.http.get<FoodIntroduction[]>(`${this.base}/introductions`);
  }

  createIntroduction(data: Partial<FoodIntroduction>) {
    return this.http.post<FoodIntroduction>(`${this.base}/introductions`, data);
  }
}
