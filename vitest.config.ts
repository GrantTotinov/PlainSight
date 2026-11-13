import { configDefaults, defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  // .claude/ holds local git worktrees with their own copy of the tests.
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
});
