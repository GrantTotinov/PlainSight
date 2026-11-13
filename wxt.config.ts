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
  vite: () => ({
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  }),
});
