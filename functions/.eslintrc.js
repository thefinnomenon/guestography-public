module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    quotes: ["error", "double"],
    "import/no-unresolved": 0,
    "object-curly-spacing": 0,
    "require-jsdoc": 0,
    indent: 0,
    "no-case-declarations": 0,
    "@typescript-eslint/no-explicit-any": 0,
    "quote-props": 0,
    "@typescript-eslint/no-var-requires": 0,
    "max-len": ["error", { code: 120 }],
    "@typescript-eslint/ban-ts-comment": 0,
    "camelcase": 0,
    "one-var": 0,
    "curly": 0,
    "operator-linebreak": 0,
  },
};
