import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['.output/', '.wxt/', 'node_modules/', 'test/fixtures/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
);
