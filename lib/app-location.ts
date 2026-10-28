// Vite supplies the build's public base. Notebook storage remains origin-local.
export const appBase = import.meta.env.BASE_URL;
export const isPortfolioEdition = appBase === '/mildlyferal/';
export const portfolioHome = isPortfolioEdition ? '/' : 'https://ben-tan.com/';
export const legacyExportUrl = 'https://mildly-feral.ben-tan.com/?view=book';
export const appAsset = (path: string) => appBase + path.replace(/^\/+/, '');
