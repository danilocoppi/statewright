import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

const unusedVars = ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }];

export default [
  {
    ignores: [
      "**/node_modules/**",
      ".worktrees/**",
      "**/coverage/**",
      "apps/editor/dist/**",
      "apps/editor/dist-hosted/**",
      "apps/editor/test-results/**",
      "apps/editor/playwright-report/**"
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals["shared-node-browser"] },
    rules: { "no-unused-vars": unusedVars }
  },
  {
    // Node-only code: CLI, scripts and tests. Library code under src/ (except src/cli) must run in browsers too.
    files: ["scripts/**/*.js", "packages/*/scripts/**/*.js", "packages/*/test/**/*.js", "packages/*/src/cli/**/*.js"],
    languageOptions: { globals: globals.node }
  },
  // The Editor: React in the browser.
  {
    files: ["apps/editor/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: { "no-unused-vars": unusedVars }
  },
  { ...reactHooks.configs.flat.recommended, files: ["apps/editor/**/*.{js,jsx}"] },
  {
    files: ["apps/editor/src/**/*.{js,jsx}"],
    plugins: { "react-refresh": reactRefresh },
    rules: { "react-refresh/only-export-components": ["warn", { allowConstantExport: true }] }
  },
  {
    // The entry point is never hot-reloaded.
    files: ["apps/editor/src/main.jsx"],
    rules: { "react-refresh/only-export-components": "off" }
  },
  {
    // Build configuration, scripts and tests also run in Node.
    files: [
      "apps/editor/*.config.js",
      "apps/editor/scripts/**/*.js",
      "apps/editor/test/**/*.{js,jsx}",
      "apps/editor/e2e/**/*.js"
    ],
    languageOptions: { globals: { ...globals.browser, ...globals.node } }
  }
];
