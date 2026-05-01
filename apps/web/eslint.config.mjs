import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{ ignores: ['node_modules/**', 'dist/**', 'build/**', '.next/**', 'src/server/express-api/**'] },
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	...tseslint.configs.recommended,
	{
		files: ['**/*.{tsx,jsx}'],
		languageOptions: {
			globals: { ...globals.browser, React: 'readonly', Intl: 'readonly' },
		},
		plugins: { react, 'react-hooks': reactHooks },
		settings: { react: { version: 'detect' } },
		rules: {
			...react.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			'react/prop-types': 'off',
			'react/no-unescaped-entities': 'off',
			'react/display-name': 'off',
			'react/jsx-uses-react': 'off',
			'react/react-in-jsx-scope': 'off',
			'react/jsx-uses-vars': 'off',
			'react/jsx-no-comment-textnodes': 'off',
		},
	},
	{
		files: ['**/*.{js,jsx}'],
		plugins: { react, 'react-hooks': reactHooks, import: importPlugin },
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parserOptions: { ecmaFeatures: { jsx: true } },
			globals: { ...globals.browser, React: 'readonly', Intl: 'readonly' },
		},
		settings: {
			react: { version: 'detect' },
			'import/resolver': {
				node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
				alias: { map: [['@', './src']], extensions: ['.js', '.jsx', '.ts', '.tsx'] },
			},
		},
		rules: {
			...react.configs.recommended.rules,
			...reactHooks.configs.recommended.rules,
			...importPlugin.flatConfigs.recommended.rules,
			'react/prop-types': 'off',
			'react/no-unescaped-entities': 'off',
			'react/display-name': 'off',
			'react/jsx-uses-react': 'off',
			'react/react-in-jsx-scope': 'off',
			'react/jsx-uses-vars': 'off',
			'react/jsx-no-comment-textnodes': 'off',
			'no-unused-vars': 'off',
			'import/no-named-as-default': 'off',
			'import/no-named-as-default-member': 'off',
			'no-undef': 'error',
			'import/no-self-import': 'error',
			'import/no-cycle': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
		},
	},
	{
		files: ['tools/**/*.js', 'tailwind.config.js', 'postcss.config.js', 'next.config.ts'],
		languageOptions: { globals: globals.node },
	},
	{
		files: ['src/lib/encryption.js'],
		languageOptions: { globals: { ...globals.browser, process: 'readonly' } },
	},
);
