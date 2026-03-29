# CONTRIBUTING

We welcome contributions from everyone in the community. Thank you for your interest in this project.
Please follow the procedures and rules below to ensure that all community members can contribute.

- All contributors must adhere to the [Code of Conduct](https://www.contributor-covenant.org/).

## Development Workflow

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint & format
pnpm check

# Build
pnpm build

# Check for unused exports
pnpm knip

# Check package publishing
pnpm publint
```

## Getting Started

- Fork this repository to your personal repository.
- Clone it to your local system using `git clone [URL of your forked repository]`.
- Create a new working branch with `git checkout -b [new branch name]`.

## Issues

### 1. Check for Duplicates

Before creating a new issue, please check existing issues.

### 2. Have a Question?

GitHub issues are for bugs and enhancement suggestions. For questions about the project, please use our contact methods.

### 3. Found a Bug?

If you want to report a bug, please use the bug issue template. It contains questions to help us track and diagnose the issue accurately.

### 4. Feature Requests

When requesting a new feature, please describe the necessity and expected benefits in as much detail as possible.

## Pull Requests

You can submit a PR directly. All commit messages and pull request titles should follow this format:

```markdown
<type>[optional package scope]: <description>

[optional body]

[optional footer(s)]
```

## Code Review

- Maintainers or project managers will review the PR and provide feedback if changes are necessary.
- If there are any modifications needed based on feedback, please update your branch with additional commits.

## Architecture Decision Records

### Why `getBaseTypeOfLiteralType` for widening

TypeScript widens single literal returns (e.g., `"idle"` → `string`) when inferring the return type of a function. We replicate this by calling `checker.getBaseTypeOfLiteralType()` on single-return values. Multi-return unions are kept as-is because TS preserves literal unions.

### Why `getUnionType` internal API

`checker.getUnionType()` is not part of the public TypeScript API, but it's the only way to programmatically create union types from an array of `ts.Type[]`. We guard its use with a `typeof` check and skip safely if unavailable.

### Why escape hatches are hardcoded

`any`, `unknown`, `never`, and `void` are always escape hatches because they represent intentionally opaque types. Users can extend this list via the `escapeHatchTypes` option.

### Why contextual typing is not handled

When a function is assigned to a typed variable, TypeScript uses contextual typing which can widen the inferred type before comparison. Solving this would require resolving contextual types from the assignment target, which adds significant complexity for a narrow set of cases.

## License

All code contributed to this project will be distributed under the [project's LICENSE](./LICENSE).
