export {}

declare global {
  // Minimal typing: Puter is loaded via https://js.puter.com/v2/ at runtime.
  // We intentionally keep this loose because Puter can change its API surface.
  const puter: any
  interface Window {
    puter?: any
  }
}

