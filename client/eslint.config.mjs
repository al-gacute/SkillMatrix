import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    js.configs.recommended,
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                localStorage: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                CustomEvent: 'readonly',
                Event: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            'react-hooks': reactHooks,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^React$' }],
            'no-undef': 'off',
            'react-hooks/exhaustive-deps': 'off',
        },
    },
];
