declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (
  email = Cypress.env('TEST_EMAIL'),
  password = Cypress.env('TEST_PASSWORD'),
) => {
  cy.visit('/auth/login');
  cy.get('#email').type(email);
  cy.get('#password').type(password);
  cy.get('button[type=submit]').click();
  cy.url().should('include', '/dashboard');
});
