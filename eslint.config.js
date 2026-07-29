// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      'public/generated/**',
      'public/uploads/**',
      'playwright-report/**',
      'test-results/**',
      'reports/**',
      'pnpm-lock.yaml',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      eqeqeq: ['warn', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // TypeScript kendi derleyicisinde (astro check) tanımsız isimleri zaten
      // yakalar; çekirdek no-undef, `keyof HTMLElementTagNameMap` gibi salt
      // tip referanslarını yanlışlıkla tanımsız değişken sanır (bilinen
      // typescript-eslint sınırlaması — resmî öneri: kapatıp tsc'ye bırakmak).
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
    },
  },
  {
    files: ['**/*.astro'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: [
      '**/*.astro/*.js',
      '**/*.astro/*.ts',
      '**/client/**/*.ts',
      'src/**/*.client.ts',
      'public/scripts/**/*.js',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['tests/e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    files: ['tests/unit/**/*.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  }
);
