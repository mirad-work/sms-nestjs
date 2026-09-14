# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- NestJS configuration parsing and public re-exports for core multi-driver fallback.
- Service metadata for fallback activation/order and adapter-level fallback contract tests.
- Documentation for safe fallback, provider overrides, and database resolver/observer hooks.

### Changed

- Success logs report the accepting driver and request correlation ID.
- `healthCheck()` is documented as configuration health, not a live provider probe.
- Kavenegar and SMS.ir environment validation no longer requires unused line numbers.

## [0.5.0] - 2026-07-16

### Changed

- **BREAKING CHANGE**: the SMS configuration is now provided under the exported `SMS_CONFIG` symbol
  instead of the string token `'SMS_CONFIG'`
  - `SMS_CONFIG` was already exported and documented as the injection token, but the module
    registered the config under the _string_ `'SMS_CONFIG'`. Injecting the documented symbol failed
    with `Nest can't resolve dependencies`, so the exported token was unusable.
  - If you inject the configuration directly, import the token instead of using the string literal:

    ```typescript
    // Before (undocumented, no longer resolves)
    constructor(@Inject('SMS_CONFIG') private config: ISmsConfig) {}

    // After
    import { SMS_CONFIG } from '@mirad-work/sms-nestjs';
    constructor(@Inject(SMS_CONFIG) private config: ISmsConfig) {}
    ```

  - Injecting `SmsService` (the common case) is unaffected.

- `SmsModule.forRoot()` and `SmsModule.forRootAsync()` now export `SMS_CONFIG` in addition to
  `SmsService`, so the configuration can be injected by consumers and resolved by feature modules.
- Requires `@mirad-work/sms-core` `^0.5.1`, which fixes malformed timeout configuration silently
  aborting every request. `NestSmsConfigHelper.createWithFallback()` delegates to the core
  environment parser, so the adapter is affected by that bug on earlier versions.

### Fixed

- **`SmsModule.forFeature()` could not be used**: it re-declares `SmsService` but the config token
  was never exported by the root registration, so importing it failed with
  `Nest can't resolve dependencies of the SmsService (?)`. It now resolves when the root module is
  registered with `isGlobal: true` (documented on the method).
- **Malformed timeout configuration no longer breaks every request**: a non-numeric `SMS_TIMEOUT`
  (e.g. `SMS_TIMEOUT=fast`) parsed to `NaN`, and because `setTimeout(fn, NaN)` fires immediately,
  every SMS request was aborted before it could be sent. `NestSmsConfigHelper` now falls back to the
  default (`10000` ms) for absent, empty, non-numeric, or non-positive values. `SMS_MOCK_DELAY` is
  parsed the same way, falling back to `0`.

### Added

- Re-exported the IPPanel types and factory from `@mirad-work/sms-core`: `IIppanelConfig` and
  `createIppanelSmsService`. IPPanel was already documented as a supported provider and worked
  through configuration, but these were missing from the adapter's public API.

### Internal

- Added `babel-plugin-transform-typescript-metadata` to the Babel config. Without it, Babel dropped
  the `design:paramtypes` metadata that Nest's injector reads, so every DI resolution failed under
  Jest even though the compiled output was correct. Tests worked around this by constructing
  `SmsService` directly, which left the module wiring untested and hid the `SMS_CONFIG` and
  `forFeature()` bugs above.
- Added `tests/sms.module.spec.ts`, which resolves `SmsService` through the Nest injector and covers
  `forRoot`, `forRootAsync` (`useFactory`/`useClass`/`inject`), `forFeature`, and `forTesting`.

## [0.4.2]

- NestJS adapter for `@mirad-work/sms-core` with `forRoot`, `forRootAsync`, `forFeature`,
  `forEnvironment`, and `forTesting` registrations.

## [0.2.0]

- Initial release with NestJS integration.
