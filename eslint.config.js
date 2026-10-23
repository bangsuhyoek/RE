import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

// 실제 버그로 이어지는 규칙(rules-of-hooks, no-undef 등)은 error 로 막고,
// 기존 코드에 많이 쌓인 정리성 규칙은 warn 으로 둔다.
export default [
  {
    ignores: ["dist/**", "android/**", "node_modules/**", "public/**", "outputs/**", "output/**", "coverage/**",
      // 저장소에 없는 로컬 디버그 스크립트(.gitignore 대상). 내용이 잘려 있어 파싱 오류가 난다.
      "append_promo.cjs", "check.mjs"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-empty": "warn",
      "no-useless-assignment": "warn",
      "no-useless-escape": "warn",
      "no-control-regex": "warn",
      "no-async-promise-executor": "warn",
      "preserve-caught-error": "warn",
    },
  },
  {
    files: ["api/**", "scripts/**", "tests/**", "vite/**", "*.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // page.evaluate 콜백은 브라우저 안에서 실행된다.
    files: ["scripts/crawler/promotions/pageFetcher.js"],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    // 테스트는 globalThis.window 를 직접 꾸며 쓴다.
    files: ["tests/**/*.js"],
    languageOptions: { globals: { window: "writable" } },
  },
];
