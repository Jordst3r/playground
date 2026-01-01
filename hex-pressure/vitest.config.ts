import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node", // no DOM
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
