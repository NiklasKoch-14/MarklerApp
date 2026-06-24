import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env['CYPRESS_BASE_URL'] || 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 8000,
  },
  env: {
    TEST_EMAIL: 'cypress@marklerapp.test',
    TEST_PASSWORD: 'Test1234!',
  },
});
