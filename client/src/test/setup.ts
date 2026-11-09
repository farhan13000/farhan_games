import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrolling; React Router's ScrollRestoration calls it.
window.scrollTo = (() => {}) as typeof window.scrollTo;
