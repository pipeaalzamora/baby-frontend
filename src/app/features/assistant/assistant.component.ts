import { Component, inject, signal, ElementRef, viewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AssistantService, ChatMessage } from '../../core/services/assistant.service';

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './assistant.component.html',
  styleUrls: ['./assistant.component.scss'],
})
export class AssistantComponent implements AfterViewChecked {
  private svc = inject(AssistantService);

  private scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');

  messages   = signal<ChatMessage[]>([]);
  draft      = signal('');
  sending    = signal(false);
  error      = signal<string | null>(null);
  disclaimer = signal<string | null>(null);
  /** Aviso mostrado cuando el backend tiene la IA deshabilitada. */
  aiNotice   = signal<string | null>(null);
  /** Aviso mostrado cuando se agota el límite diario gratuito (requiere premium). */
  premiumNotice = signal<string | null>(null);

  private shouldScroll = false;

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollAnchor()?.nativeElement.scrollIntoView({ behavior: 'smooth' });
      this.shouldScroll = false;
    }
  }

  send() {
    const text = this.draft().trim();
    if (!text || this.sending()) return;

    // Historial previo a este mensaje (lo que ya existe en pantalla)
    const history: ChatMessage[] = this.messages().map(m => ({ role: m.role, content: m.content }));

    this.messages.update(list => [...list, { role: 'user', content: text }]);
    this.draft.set('');
    this.sending.set(true);
    this.error.set(null);
    this.aiNotice.set(null);
    this.premiumNotice.set(null);
    this.shouldScroll = true;

    this.svc.chat(text, history).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.disclaimer.set(res.disclaimer || null);
        if (!res.aiEnabled) {
          // IA deshabilitada: mostramos el reply como aviso informativo
          this.aiNotice.set(res.reply);
        }
        if (res.limitReached || res.premiumRequired) {
          // Límite diario gratuito agotado: invitamos a hacerse premium.
          this.premiumNotice.set(res.reply);
        }
        this.messages.update(list => [...list, { role: 'assistant', content: res.reply }]);
        this.shouldScroll = true;
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(err?.error?.error ?? 'No pudimos contactar al asistente. Intenta nuevamente.');
      },
    });
  }

  onEnter(event: Event) {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return;
    event.preventDefault();
    this.send();
  }
}
