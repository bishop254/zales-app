// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      'import/no-unresolved': [
        'error',
        {
          ignore: ['expo-file-system', 'expo-file-system/legacy'],
        },
      ],
      'import/namespace': 'off',
    },
  },
]);
