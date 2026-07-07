import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const { default: tsconfigPaths } = await import("vite-tsconfig-paths");

  return {
    plugins: [tsconfigPaths()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./vitest.setup.ts"],
      include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    },
  };
});
