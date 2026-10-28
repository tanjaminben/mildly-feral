import { defineConfig, mergeConfig } from 'vite';
import browser from './vite.browser.config.ts';

// Separate output keeps the existing subdomain build available for exports.
export default mergeConfig(browser, defineConfig({
  base: '/mildlyferal/',
  build: { outDir: 'dist/portfolio/mildlyferal' },
  plugins: [{
    name: 'portfolio-canonical-address',
    transformIndexHtml(html) {
      return html.replace('https://mildly-feral.ben-tan.com/', 'https://ben-tan.com/mildlyferal')
        .replace('<meta name="theme-color"', '<meta name="robots" content="noindex, follow">\n  <meta name="theme-color"');
    },
  }],
}));
