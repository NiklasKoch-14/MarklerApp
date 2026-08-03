import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { workflowGuardInterceptor } from './workflow-guard.interceptor';
import { WorkflowGuardService } from '../workflow/workflow-guard.service';
import { WorkflowViolation } from '../workflow/workflow-violation.model';

describe('workflowGuardInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let guard: WorkflowGuardService;

  const violation: WorkflowViolation = {
    code: 'PROPERTY_SOLD_WITH_OPEN_VIEWINGS',
    severity: 'WARN',
    messageKey: 'workflow.rule.propertySoldWithOpenViewings',
    params: { count: 3 },
    affected: [{ type: 'VIEWING', id: 'v1', label: '12.08. 14:00 - Mueller' }]
  };

  const warningBody = { type: 'WORKFLOW_WARNING', violations: [violation] };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([workflowGuardInterceptor])),
        provideHttpClientTesting()
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    guard = TestBed.inject(WorkflowGuardService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('opens the dialog on a WORKFLOW_WARNING 409 and retries the same request with acknowledgedRules on confirm', () => {
    const askSpy = spyOn(guard, 'ask').and.returnValue(of(true));
    let result: unknown;

    http.put('/api/v1/properties/p1', { status: 'SOLD' }).subscribe(res => (result = res));

    const req1 = httpMock.expectOne('/api/v1/properties/p1');
    req1.flush(warningBody, { status: 409, statusText: 'Conflict' });

    expect(askSpy).toHaveBeenCalledWith([violation]);

    const req2 = httpMock.expectOne('/api/v1/properties/p1');
    expect(req2.request.body).toEqual({
      status: 'SOLD',
      acknowledgedRules: ['PROPERTY_SOLD_WITH_OPEN_VIEWINGS']
    });
    req2.flush({ status: 'SOLD' });

    expect(result).toEqual({ status: 'SOLD' });
  });

  it('propagates the original error and issues no retry when declined', () => {
    spyOn(guard, 'ask').and.returnValue(of(false));
    let error: unknown;

    http.put('/api/v1/properties/p1', { status: 'SOLD' }).subscribe({
      error: err => (error = err)
    });

    const req1 = httpMock.expectOne('/api/v1/properties/p1');
    req1.flush(warningBody, { status: 409, statusText: 'Conflict' });

    httpMock.expectNone('/api/v1/properties/p1');
    expect((error as { status: number }).status).toBe(409);
  });

  it('merges an existing acknowledgedRules array instead of overwriting it, without duplicates', () => {
    spyOn(guard, 'ask').and.returnValue(of(true));

    http
      .put('/api/v1/properties/p1', { status: 'SOLD', acknowledgedRules: ['SOME_OTHER_RULE', 'PROPERTY_SOLD_WITH_OPEN_VIEWINGS'] })
      .subscribe();

    const req1 = httpMock.expectOne('/api/v1/properties/p1');
    req1.flush(warningBody, { status: 409, statusText: 'Conflict' });

    const req2 = httpMock.expectOne('/api/v1/properties/p1');
    expect(req2.request.body.acknowledgedRules.sort()).toEqual(
      ['SOME_OTHER_RULE', 'PROPERTY_SOLD_WITH_OPEN_VIEWINGS'].sort()
    );
    req2.flush({ status: 'SOLD' });
  });

  it('passes a 409 that is not WORKFLOW_WARNING straight through without opening the dialog', () => {
    const askSpy = spyOn(guard, 'ask').and.returnValue(of(true));
    let error: unknown;

    http.put('/api/v1/properties/p1', { status: 'SOLD' }).subscribe({
      error: err => (error = err)
    });

    const req1 = httpMock.expectOne('/api/v1/properties/p1');
    req1.flush({ message: 'some other conflict' }, { status: 409, statusText: 'Conflict' });

    expect(askSpy).not.toHaveBeenCalled();
    expect((error as { status: number }).status).toBe(409);
  });

  it('passes a 422 (WORKFLOW_BLOCKED) straight through without opening the dialog', () => {
    const askSpy = spyOn(guard, 'ask').and.returnValue(of(true));
    let error: unknown;

    http.put('/api/v1/properties/p1', { status: 'SOLD' }).subscribe({
      error: err => (error = err)
    });

    const req1 = httpMock.expectOne('/api/v1/properties/p1');
    req1.flush(
      { type: 'WORKFLOW_BLOCKED', violations: [violation] },
      { status: 422, statusText: 'Unprocessable Entity' }
    );

    expect(askSpy).not.toHaveBeenCalled();
    expect((error as { status: number }).status).toBe(422);
  });
});
