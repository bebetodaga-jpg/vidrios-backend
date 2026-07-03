// ESLint flat config — estándares del Sprint 0 (ver gestion-proyecto/tech-lead/sprint-0/estandares-de-codigo.md)
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'class', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'] },
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        { selector: 'variable', modifiers: ['const', 'global'], format: ['UPPER_CASE', 'camelCase', 'PascalCase'] },
        // Tras quitar el prefijo, el resto queda en PascalCase: esActivo → Activo
        { selector: 'variable', types: ['boolean'], format: ['PascalCase'], prefix: ['es', 'tiene', 'puede', 'debe', 'hay'] },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Los @Module de NestJS son clases vacías por diseño del framework
    files: ['**/*.module.ts'],
    rules: { '@typescript-eslint/no-extraneous-class': 'off' },
  },
  {
    // El dominio no puede importar framework ni infraestructura (regla hexagonal)
    files: ['src/modules/*/dominio/**/*.ts', 'src/shared/dominio/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@nestjs/*', '@prisma/*', 'passport*', 'bcrypt'], message: 'El dominio no importa framework: use puertos (interfaces).' }] },
      ],
    },
  },
);
