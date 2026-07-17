export const environment = {
  production: true,
  apiUrl: '/api/v1',
  defaultLanguage: 'de' as 'de' | 'en',
  // OAuth Client ID from Google Cloud Console — public by design, not a secret.
  // Blank hides the Google sign-in button.
  googleClientId: ''
};