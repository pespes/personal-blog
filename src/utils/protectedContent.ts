// Shared between the build step that encrypts protected case studies
// (src/integrations/protectCaseStudies.ts) and ProtectedContent.astro, which
// renders the markers and decrypts in the browser.

/** Wraps the content to encrypt. Replaced by the ciphertext at build time. */
export const PROTECTED_START = "<template data-protected-start></template>";
export const PROTECTED_END = "<template data-protected-end></template>";

/** PBKDF2-SHA256 iterations used to derive the AES-GCM key from the password. */
export const PBKDF2_ITERATIONS = 310_000;
