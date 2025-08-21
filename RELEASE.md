# Release Process

This document explains how to release a new version of `@mirad-work/sms-nestjs` to npm using the automated GitHub Actions workflow.

## Prerequisites

1. **NPM Token**: Ensure you have an NPM token configured in your GitHub repository secrets as `NPM_TOKEN`
2. **Repository Access**: You need push access to the repository to create tags

## Release Steps

### 1. Prepare Your Changes

Before releasing, ensure all your changes are:

- ✅ Committed to the main branch
- ✅ All tests are passing (`npm run validate`)
- ✅ Code is linted and formatted
- ✅ Documentation is updated

### 2. Version Bump

Choose the appropriate version bump based on your changes:

#### Patch Release (Bug fixes)

```bash
npm version patch
```

#### Minor Release (New features, backward compatible)

```bash
npm version minor
```

#### Major Release (Breaking changes)

```bash
npm version major
```

### 3. Automated Release Process

When you run `npm version`, it will automatically:

1. **Pre-version Hook**: Run validation (typecheck, lint, tests)
2. **Version Update**: Update `package.json` version
3. **Git Operations**: Create a commit and tag
4. **Post-version Hook**: Push changes and tags to GitHub

### 4. GitHub Actions Workflow

Once the tag is pushed, GitHub Actions will automatically:

1. **Test & Lint**: Run tests across Node.js 18.x, 20.x, and 22.x
2. **Build**: Compile TypeScript and create build artifacts
3. **Create Release**: Create a GitHub release with the new version
4. **Publish to NPM**: Automatically publish the package to npm
5. **Security Audit**: Run security checks

## Workflow Jobs

### Test & Lint

- Runs on multiple Node.js versions (18.x, 20.x, 22.x)
- Executes type checking, linting, and tests
- Uploads coverage reports

### Build

- Compiles TypeScript to JavaScript
- Creates build artifacts
- Uploads artifacts for the publish job

### Create Release

- Creates a GitHub release with the new version
- Includes installation instructions
- Only runs on version tags

### Publish to NPM

- Publishes the package to npm registry
- Uses NPM_TOKEN from repository secrets
- Only runs on version tags

### Security Audit

- Runs npm audit with moderate level
- Checks for known vulnerabilities
- Runs on all pushes and pull requests

## Manual Release (if needed)

If you need to manually trigger a release:

1. Create and push a version tag:

   ```bash
   git tag v0.2.1
   git push origin v0.2.1
   ```

2. The workflow will automatically trigger and publish to npm

## Troubleshooting

### Common Issues

1. **Tests Failing**: Fix any failing tests before version bump
2. **Lint Errors**: Run `npm run lint:fix` to auto-fix issues
3. **Type Errors**: Run `npm run typecheck` to identify type issues
4. **NPM Token Issues**: Ensure `NPM_TOKEN` is properly configured in GitHub secrets

### Rollback

If a release fails or you need to rollback:

1. **Unpublish from NPM** (within 72 hours):

   ```bash
   npm unpublish @mirad-work/sms-nestjs@0.2.1
   ```

2. **Delete the tag**:

   ```bash
   git tag -d v0.2.1
   git push origin :refs/tags/v0.2.1
   ```

3. **Revert the version**:

   ```bash
   npm version 0.2.0 --no-git-tag-version
   git add package.json
   git commit -m "Revert version to 0.2.0"
   git push
   ```

## Version History

- `0.2.0` - Initial release with NestJS integration
- Future versions will be documented here

## Support

If you encounter issues with the release process:

1. Check the GitHub Actions logs for detailed error messages
2. Ensure all prerequisites are met
3. Contact the maintainers if issues persist
