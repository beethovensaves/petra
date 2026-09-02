import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Every integration suite owns the same disposable database and resets
    // authority tables between cases. Keep files serial so their transactions
    // cannot truncate one another's prerequisites or deadlock on FK cascades.
    fileParallelism: false,
    include: ["test/**/*.test.ts"],
  },
});
