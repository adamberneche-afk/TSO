# Lessons Learned from Recent Bug Fixes

## Summary of Issues

During a deep dive and debugging session, several categories of bugs were identified and fixed across the codebase (frontend and backend). The primary sources of failure were:

1. **Unsafe Property Access**
   - Directly accessing `.length`, `.trim()`, or object properties on values that could be `null` or `undefined`.
   - Examples: LLM API responses, `window.ethereum`, `localStorage` JSON parsing.

2. **Race Conditions**
   - Checking the availability of `window.ethereum` (MetaMask) long before actually using it, allowing the user to disconnect their wallet in the interim.
   - Affected multiple components that interact with blockchain wallets.

3. **Missing Error Handling**
   - `JSON.parse()` calls without `try/catch` leading to crashes when `localStorage` contained corrupted data.
   - Async functions lacking `try/catch` blocks, causing unhandled promise rejections.

4. **Incorrect Prisma Usage**
   - Using incorrect property names on the Prisma client (e.g., `githubToken` instead of `gitHubToken`) due to case‑sensitivity mismatches with the generated schema.
   - Invalid relation `connect` syntax (missing nested `create`/`connect` structure) causing TypeScript errors.

5. **Insufficient Type Safety**
   - Overuse of `any` types or missing type guards, which let runtime errors slip through when `strictNullChecks` or `noImplicitAny` were not enforced.
   - Dependence on generated Prisma client types without ensuring they are up‑to‑date.

## Root Causes

- **Lack of defensive programming** – assumptions that values are present without validation.
- **Inadequate tooling configuration** – TypeScript strictness not uniformly applied, ESLint rules missing for common pitfalls.
- **Insufficient test coverage** – especially for edge cases like null inputs, corrupted storage, and race conditions.
- **Manual steps not automated** – e.g., forgetting to run `prisma generate` or to update generated types before committing.
- **Code review oversights** – subtle issues like incorrect property casing or missing dependency arrays were not caught.

## Preventive Measures

To avoid recurrence of these issues, the following practices should be adopted and enforced:

### 1. Strengthen TypeScript Configuration
- Enable strict flags in **all** `tsconfig.json` files:
  - `"strict": true` (or at least `"strictNullChecks": true`, `"noImplicitAny": true`, `"exactOptionalPropertyTypes": true`).
- Add a CI step that fails the build if any new `any` type appears (disallow `// @ts-ignore` or require a review comment).

### 2. Enforce ESLint Rules
Install and configure `eslint-plugin-import`, `@typescript-eslint`, and `eslint-plugin-react-hooks` with rules such as:
- `@typescript-eslint/no-non-null-assertion`: ban `!` unless absolutely necessary.
- `@typescript-eslint/restrict-plus-operands`: prevent accidental string/number concatenation.
- `@typescript-eslint/require-await`: ensure async functions actually await.
- `@typescript-eslint/promise-function-async`: ensure functions returning promises are marked `async`.
- `@typescript-eslint/explicit-function-return-type`: require return types on exported functions.
- `react-hooks/exhaustive-deps`: validate `useEffect` dependency arrays.
- `react-hooks/rules-of-hooks`: enforce Hooks rules.
- `no-restricted-properties`: create a custom rule to disallow direct access to `window.ethereum` without going through a helper.
- `no-floating-promises`: catch unhandled promise rejections.

### 3. Improve Error Handling Patterns
- Wrap all `JSON.parse` and `JSON.stringify` calls in `try/catch`; on parse error, clear the corrupted storage entry.
- Ensure every `async` function has a `try/catch` or returns a promise that is handled by the caller (using `.catch` or `await` in a `try` block).
- Use a centralized error‑reporting utility (e.g., Sentry or custom toast) to surface unexpected errors to developers and users.

### 4. Prisma Client Safety
- Make `prisma generate` an explicit step in the build script (`"build": "prisma generate && tsc"`), so outdated client types cause a build failure.
- Add a lint rule (via `typescript-eslint` or a custom script) that checks that any property accessed on the Prisma client matches the schema (can be done by ensuring the generated `.d.ts` files are part of the type‑check).
- In code reviews, verify that Prisma property names exactly match those in `schema.prisma` (case‑sensitive).
- Consider wrapping Prisma client calls in a service layer that isolates direct client usage, making it easier to mock in tests.

### 5. Testing Strategy
- **Unit tests** for services:
  - `apiKeyManager`: test with valid, missing, and corrupted `localStorage` data.
  - `llmClient`: test with null/undefined responses, malformed JSON.
  - `githubTokenService`: test with missing token, invalid token format.
- **Integration tests** for critical flows:
  - Wallet connection flow (connect, get API key, disconnect mid‑flow).
  - Conversation flow: sending a message, receiving LLM response, handling empty/null responses.
  - Skill publishing: creating a skill with and without category links.
- **Snapshot tests** for generated Prisma client types (optional) to detect unexpected changes.
- Use `msw` or `jest.mock` to mock external APIs (ethers, Slack, LLM providers) to ensure deterministic tests.

### 6. Pre‑Commit Hooks
- Use `husky` + `lint-staged` to run:
  - `eslint --fix`
  - `tsc --noEmit` (or full type check)
  - `npm test` (or a subset of fast unit tests)
  - `prisma generate` (if not already in build)
- Only allow commits if all checks pass.

### 7. Runtime Guard Helpers
Create small utility functions to encourage safe access patterns:
```ts
// safeGet.ts
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K, defaultValue: T[K]): T[K] {
  return obj == null ? defaultValue : obj[key];
}

// withMetaMask.ts
export async function withMetaMask<T>(fn: (provider: any) => Promise<T>): Promise<T> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask not detected');
  }
  // Re‑check right before use to mitigate race conditions
  if (!window.ethereum) {
    throw new Error('MetaMask disconnected');
  }
  return fn(window.ethereum);
}
```
Use these helpers throughout the codebase instead of raw property checks.

### 8. Documentation & Onboarding
- Add a `DEVELOPMENT_GUIDE.md` that outlines:
  - How to set up the local dev environment with the correct TypeScript and ESLint settings.
  - Common pitfalls (wallet race conditions, localStorage corruption, Prisma gotchas) and how to avoid them.
  - Steps to add a new service or component safely (checklist).
- Include a section in the `CONTRIBUTING.md` that references this guide.

### 9. Continuous Improvement
- Periodically run `npm audit` and update dependencies to address known vulnerabilities.
- Schedule a monthly “tech debt” sprint to revisit any `any` types, `// @ts-ignore` comments, or temporary fixes and replace them with proper solutions.
- Monitor build logs for warnings (e.g., large chunk size) and address them as part of regular maintenance.

## Conclusion

By combining stronger static analysis (TypeScript, ESLint), robust error handling, comprehensive testing, and automated checks in the development workflow, we can significantly reduce the likelihood of similar bugs reaching production. The fixes applied have already restored functionality; adopting the preventive measures above will help ensure the codebase remains reliable and aligned with our North Star goals of secure, user‑owned AI agents.
