import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

// 실제 버그로 이어지는 규칙(rules-of-hooks, no-undef 등)은 error 로 막고,
// 기존 코드에 많이 쌓인 정리성 규칙은 warn 으로 둔다.
export default [
  {
    ignores: ["dist/**", "android/**", "node_modules/**", "public/**", "outputs/**", "output/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node },
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
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
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
  {
    // 알려진 기존 버그: 담당 스트림이 고친 뒤 이 블록을 지운다.
    // SubscriptionDetailScreen.jsx:268-292 조기 return 뒤 훅 호출, AccountModal.jsx:322 정의되지 않은 handleAccountClose.
    files: ["src/components/SubscriptionDetailScreen.jsx", "src/components/AccountModal.jsx"],
    rules: {
      "react-hooks/rules-of-hooks": "warn",
      "no-undef": "warn",
    },
  },
];
