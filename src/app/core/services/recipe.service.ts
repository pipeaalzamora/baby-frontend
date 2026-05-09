import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Recipe, FoodIntroduction } from '../models/models';

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

  listIntroductions() {
    return this.http.get<FoodIntroduction[]>(`${this.base}/introductions`);
  }

  createIntroduction(data: Partial<FoodIntroduction>) {
    return this.http.post<FoodIntroduction>(`${this.base}/introductions`, data);
  }
}
