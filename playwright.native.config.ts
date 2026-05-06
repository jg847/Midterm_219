import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const port = 3010;
const baseURL = `http://127.0.0.1:${port}`;
const rootDir = path.resolve(__dirname);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /native-tool-use\.spec\.ts/,
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
      E2E_NATIVE_TOOL_USE_MODEL: "scripted",
      NEXT_PUBLIC_ENABLE_NATIVE_TOOL_USE: "true",
      NEXT_PUBLIC_USE_MOCK_CHAT: "false",
      NEXT_PUBLIC_ENABLE_SESSION_MEMORY: "true",
      CONVERSATION_STORE_DRIVER: "memory",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});