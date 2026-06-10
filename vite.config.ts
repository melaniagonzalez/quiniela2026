import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Generate build version
  const buildVersion = `${new Date().getTime()}`;

  // Ensure dist folder exists and write the buildVersion to version.txt so the server can read it
  try {
    const distDir = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    fs.writeFileSync(path.join(distDir, 'version.txt'), buildVersion, 'utf-8');
  } catch (err) {
    console.warn('Failed to pre-create and write version.txt to dist:', err);
  }

  // Also write the buildVersion to src/version.ts so that the server (which might be bundled serverlessly) can import it statically
  try {
    const srcDir = path.resolve(__dirname, 'src');
    if (fs.existsSync(srcDir)) {
      fs.writeFileSync(path.join(srcDir, 'version.ts'), `export const APP_VERSION = ${JSON.stringify(buildVersion)};\n`, 'utf-8');
    }
  } catch (err) {
    console.warn('Failed to write version.ts to src:', err);
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(buildVersion),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
