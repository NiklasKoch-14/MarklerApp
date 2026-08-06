import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ErrorHandlerService, ErrorType } from '../../../../core/services/error-handler.service';

/**
 * Der Besichtigungs-Dialog las den Fehler frueher ueber `err.error.message` aus.
 * `ProcessedError` hat kein Feld `error` — der Ausdruck war immer `undefined`, und die
 * Komponente zeigte bei jedem Fehler denselben hartcodierten deutschen Satz (Issue #50).
 *
 * <p>Diese Tests halten das Verhalten fest, auf das der Dialog jetzt baut: die Meldung
 * kommt aus {@link ErrorHandlerService#getUserMessage}, ein abgelehnter Workflow-Hinweis
 * liefert einen leeren String (kein Banner), ein echter Fehler eine uebersetzte Meldung.</p>
 */
describe('ViewingAddDialog Fehlerauswertung (#50)', () => {
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [ErrorHandlerService]
    });

    errorHandler = TestBed.inject(ErrorHandlerService);
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      errors: {
        serverError: 'Serverfehler. Bitte spaeter erneut versuchen.',
        unknownError: 'Unbekannter Fehler',
        validationError: 'Bitte Eingaben pruefen'
      }
    });
    translate.use('de');
  });

  it('liefert fuer einen abgelehnten Workflow-Hinweis einen leeren Text, damit kein Banner erscheint', () => {
    const declined = new HttpErrorResponse({
      status: 409,
      error: { type: 'WORKFLOW_WARNING', violations: [{ code: 'VIEWING_SCHEDULED_IN_PAST', severity: 'WARN', messageKey: 'workflow.rule.viewingInPast' }] }
    });

    const processed = errorHandler.processError(declined);

    expect(processed.type).toBe(ErrorType.WORKFLOW_CANCELLED);
    expect(errorHandler.getUserMessage(processed)).toBe('');
  });

  it('liefert fuer einen echten Serverfehler eine uebersetzte Meldung', () => {
    const serverError = new HttpErrorResponse({ status: 500, error: { message: 'boom' } });

    const message = errorHandler.getUserMessage(errorHandler.processError(serverError));

    expect(message).toBe('Serverfehler. Bitte spaeter erneut versuchen.');
    expect(message).not.toBe('');
  });

  it('faellt nie auf den rohen englischen Backend-Text zurueck', () => {
    const unknownBackendText = new HttpErrorResponse({
      status: 400,
      error: { message: 'Some untranslated internal detail' }
    });

    expect(errorHandler.getUserMessage(errorHandler.processError(unknownBackendText)))
      .toBe('Bitte Eingaben pruefen');
  });
});
