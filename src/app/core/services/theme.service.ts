import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _dark = signal<boolean>(
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  readonly isDark = this._dark.asReadonly();

  constructor() {
    effect(() => {
      const dark = this._dark();
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
    // Apply immediately on init
    document.documentElement.setAttribute('data-theme', this._dark() ? 'dark' : 'light');
  }

  toggle() {
    this._dark.update(v => !v);
  }
}
