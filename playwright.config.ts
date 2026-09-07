import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5174',
    channel: 'chrome',
    headless: true,
    // Real GPU so the 3D specs exercise WebGL the way users see it.
    launchOptions: { args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] },
  },
  webServer: {
    command: 'pnpm dev --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
