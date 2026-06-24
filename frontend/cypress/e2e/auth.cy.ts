const uniqueEmail = () => `cypress.${Date.now()}@marklerapp.test`;

const TEST_EMAIL = Cypress.env('TEST_EMAIL') as string;
const TEST_PASSWORD = Cypress.env('TEST_PASSWORD') as string;

function ensureTestUserExists() {
  cy.request({
    method: 'POST',
    url: '/api/v1/auth/register',
    body: {
      firstName: 'Cypress',
      lastName: 'TestUser',
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      languagePreference: 'DE',
    },
    failOnStatusCode: false,
  });
}

describe('Login', () => {
  before(ensureTestUserExists);
  beforeEach(() => cy.visit('/auth/login'));

  it('zeigt Fehler bei falschen Zugangsdaten', () => {
    cy.get('#email').type('nobody@example.com');
    cy.get('#password').type('WrongPass123!');
    cy.get('button[type=submit]').click();
    cy.get('[class*=error], [class*=alert]').should('be.visible');
    cy.url().should('include', '/auth/login');
  });

  it('leitet nach erfolgreichem Login zum Dashboard weiter', () => {
    cy.get('#email').type(TEST_EMAIL);
    cy.get('#password').type(TEST_PASSWORD);
    cy.get('button[type=submit]').click();
    cy.url().should('include', '/dashboard');
  });

  it('Link zur Registrierung ist vorhanden', () => {
    cy.contains('a', /register|registrier/i).should('be.visible');
  });
});

describe('Register', () => {
  before(ensureTestUserExists);
  beforeEach(() => cy.visit('/auth/register'));

  it('registriert erfolgreich mit gültigen Daten', () => {
    cy.get('#firstName').type('Cypress');
    cy.get('#lastName').type('Test');
    cy.get('#email').type(uniqueEmail()).blur();
    cy.get('#password').type('Test1234!');
    cy.get('#confirmPassword').type('Test1234!');
    cy.get('button[type=submit]').click();
    cy.url().should('include', '/dashboard');
  });

  it('akzeptiert leere Handynummer (optionales Feld)', () => {
    cy.get('#firstName').type('Cypress');
    cy.get('#lastName').type('NoPhone');
    cy.get('#email').type(uniqueEmail()).blur();
    cy.get('#password').type('Test1234!');
    cy.get('#confirmPassword').type('Test1234!');
    cy.get('button[type=submit]').click();
    cy.url().should('include', '/dashboard');
  });

  it('zeigt Fehler bei bereits genutzter E-Mail', () => {
    cy.get('#firstName').type('Cypress');
    cy.get('#lastName').type('Dupe');
    cy.get('#email').type(TEST_EMAIL).blur();
    cy.get('[class*=error]', { timeout: 12000 }).should('be.visible');
  });

  it('blockiert Absenden bei nicht übereinstimmenden Passwörtern', () => {
    cy.get('#firstName').type('Cypress');
    cy.get('#lastName').type('Test');
    cy.get('#email').type(uniqueEmail()).blur();
    cy.get('#password').type('Test1234!');
    cy.get('#confirmPassword').type('Other5678!').blur();
    cy.get('button[type=submit]').should('be.disabled');
  });

  it('blockiert Absenden bei zu kurzem Passwort', () => {
    cy.get('#firstName').type('Cypress');
    cy.get('#lastName').type('Test');
    cy.get('#email').type(uniqueEmail()).blur();
    cy.get('#password').type('short').blur();
    cy.get('button[type=submit]').should('be.disabled');
  });
});

describe('Auth Guards', () => {
  before(ensureTestUserExists);

  it('leitet unauthentifizierten Nutzer vom Dashboard zum Login', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/auth/login');
  });

  it('bleibt nach Login auf Dashboard nach Reload', () => {
    cy.login();
    cy.reload();
    cy.url().should('include', '/dashboard');
  });
});
