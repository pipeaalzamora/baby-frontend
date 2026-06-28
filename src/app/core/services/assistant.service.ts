import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  aiEnabled: boolean;
  reply: string;
  disclaimer: string;
  /** El backend lo envía cuando se agota el límite diario gratuito. */
  limitReached?: boolean;
  /** El backend lo envía cuando la función requiere premium. */
  premiumRequired?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/assistant`;

  /** Envía un mensaje al asistente de crianza junto con el historial previo. */
  chat(message: string, history: ChatMessage[]) {
    return this.http.post<ChatResponse>(`${this.base}/chat`, {
      message,
      history,
    } as ChatRequest);
  }
}
