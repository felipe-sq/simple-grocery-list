module.exports = {
  extends: ['expo'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'web-build/', '.expo/', 'supabase/functions/'],
};
