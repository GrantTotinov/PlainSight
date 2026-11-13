import { defineConfig } from 'wxt';
import { HOST_PERMISSIONS } from './src/lib/hosts';

export default defineConfig({
  srcDir: 'src',
  publicDir: 'public',
  manifest: ({ browser }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'declarativeNetRequestWithHostAccess'],
    host_permissions: HOST_PERMISSIONS,
    // Keyboard shortcuts need no permission. Users can change them in the browser's settings.
    // Chrome refuses to assign Alt+Shift+P (tested), Alt+Shift+H works.
    commands: {
      'toggle-tab': {
        suggested_key: { default: 'Alt+Shift+H' },
        description: '__MSG_commandToggleTab__',
      },
    },
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'plainsight@granttotinov',
          strict_min_version: '140.0',
          data_collection_permissions: { required: ['none'] },
        },
        // Android 142+ shows the built-in data consent; every API used here is supported there.
        gecko_android: { strict_min_version: '142.0' },
      },
    }),
  }),
  zip: {
    // AMO needs the sources to rebuild the add-on; test pages and local profiles are not needed.
    excludeSources: [
      'test/fixtures/**',
      '.playwright-profile/**',
      '.playwright-mcp/**',
      'store/**',
    ],
  },
  vite: () => ({
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  }),
});
