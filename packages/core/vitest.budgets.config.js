// The performance budgets that time whole processes (AI interface spec §11), run apart from the tests and one at a
// time: `npm run budgets -w statewright`.
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["test/budgets/**/*.budget.js"], fileParallelism: false } });
