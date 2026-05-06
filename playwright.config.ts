import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const port = 3007;
const baseURL = `http://127.0.0.1:${port}`;
const rootDir = path.resolve(__dirname);

export default defineConfig({
  testDir: "./e2e",
  testIgnore: /native-tool-use\.spec\.ts/,
  fullyParallel: true,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${port}`,
    cwd: rootDir,
    url: baseURL,
    reuseExistingServer: false,
    env: {
      CONVERSATION_STORE_DRIVER: "memory",
      NEXT_PUBLIC_USE_MOCK_CHAT: "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});