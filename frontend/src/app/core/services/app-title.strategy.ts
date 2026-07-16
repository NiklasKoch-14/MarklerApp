import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

const APP_NAME = 'MarklerApp';

/** Translates route `title` values (i18n keys) into localized browser tab titles. */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  constructor(
    private readonly title: Title,
    private readonly translate: TranslateService
  ) {
    super();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    if (!key) {
      this.title.setTitle(APP_NAME);
      return;
    }
    this.translate.get(key).subscribe(translated => {
      // ngx-translate returns the key itself when no translation exists
      this.title.setTitle(translated === key ? APP_NAME : `${translated} – ${APP_NAME}`);
    });
  }
}
