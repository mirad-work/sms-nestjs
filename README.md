# @mirad-work/sms-nestjs

NestJS dependency-injection adapter for the single `@mirad-work/sms-core` driver contract.
Kavenegar, SMS.ir, Melipayamak, IPPanel, and Mock all use `SmsService.verify()`; the adapter
does not duplicate provider or fallback logic.

## Install

```bash
npm install @mirad-work/sms-nestjs @mirad-work/sms-core @nestjs/config
```

## Register and send

```typescript
import { Module } from '@nestjs/common';
import { DriverType, SmsModule } from '@mirad-work/sms-nestjs';

@Module({
  imports: [
    SmsModule.forRoot({
      defaultDriver: DriverType.KAVENEGAR,
      fallback: {
        enabled: true,
        order: [DriverType.SMSIR, DriverType.MELIPAYAMAK],
      },
      drivers: {
        kavenegar: {
          url: 'https://api.kavenegar.com/v1/',
          apiKey: process.env.SMS_KAVENEGAR_API_KEY!,
        },
        smsir: {
          url: 'https://api.sms.ir/v1/',
          apiKey: process.env.SMS_SMSIR_API_KEY!,
        },
        melipayamak: {
          url: 'https://rest.payamak-panel.com/api/SendSMS/',
          username: process.env.SMS_MELIPAYAMAK_USERNAME!,
          password: process.env.SMS_MELIPAYAMAK_PASSWORD!,
        },
      },
    }),
  ],
})
export class AppModule {}
```

```typescript
import { Injectable } from '@nestjs/common';
import { DriverType, SmsService } from '@mirad-work/sms-nestjs';

@Injectable()
export class OtpService {
  constructor(private readonly sms: SmsService) {}

  send(phone: string, token: string) {
    return this.sms.verify({
      to: phone,
      template: 'otp-default',
      tokens: { token },
      providerOverrides: {
        [DriverType.KAVENEGAR]: { template: 'otp-payehsho' },
        [DriverType.MELIPAYAMAK]: {
          template: '496378',
          tokens: { one: token },
        },
      },
    });
  }
}
```

## Fallback safety

Fallback is opt-in. The explicit message driver, or otherwise the default, is tried first;
the configured order follows with duplicates removed. Only provider/HTTP-confirmed
rejections advance. Timeout, network, and other ambiguous results stop because the provider
may already have accepted the SMS. Invalid recipients are terminal. No provider is retried.

An accepted submission is not a delivery receipt. Inspect `submissionStatus`, `driver`,
`requestId`, and the sanitized `attempts` array. Attempt metadata excludes recipients,
templates, tokens, credentials, and raw responses.

## Configuration from `ConfigService`

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestSmsConfigHelper, SmsModule } from '@mirad-work/sms-nestjs';

SmsModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    NestSmsConfigHelper.createFromConfigService(config),
});
```

```env
SMS_DEFAULT_DRIVER=kavenegar
SMS_TIMEOUT=10000
SMS_FALLBACK_ENABLED=true
SMS_FALLBACK_ORDER=smsir,melipayamak,ippanel

SMS_KAVENEGAR_URL=https://api.kavenegar.com/v1/
SMS_KAVENEGAR_API_KEY=...
SMS_SMSIR_URL=https://api.sms.ir/v1/
SMS_SMSIR_API_KEY=...
SMS_MELIPAYAMAK_URL=https://rest.payamak-panel.com/api/SendSMS/
SMS_MELIPAYAMAK_USERNAME=...
SMS_MELIPAYAMAK_PASSWORD=...
SMS_IPPANEL_URL=https://api2.ippanel.com/
SMS_IPPANEL_API_KEY=...
SMS_IPPANEL_LINE_NUMBER=...
```

Kavenegar and SMS.ir verification do not require line numbers. IPPanel does. The current
IPPanel implementation uses the legacy API2 pattern endpoint; Edge API migration is not
implicit.

## Database-backed order and attempt storage

Use `forRootAsync` to attach application-owned hooks. Core remains stateless:

```typescript
SmsModule.forRootAsync({
  inject: [SmsPolicyRepository, SmsAttemptRepository],
  useFactory: (
    policies: SmsPolicyRepository,
    attempts: SmsAttemptRepository
  ) => ({
    defaultDriver: DriverType.KAVENEGAR,
    drivers: loadProviderConfiguration(),
    fallback: {
      enabled: true,
      order: [DriverType.SMSIR],
      resolver: context => policies.resolve(context.availableDrivers),
      observer: attempt => attempts.insert(attempt),
    },
  }),
});
```

A resolver error uses the static order. An observer error is ignored. Neither hook receives
message content or credentials.

## Module variants

- `SmsModule.forRoot(config)` registers synchronous configuration.
- `SmsModule.forRootAsync(options)` supports `useFactory`, `useClass`, and injection.
- `SmsModule.forEnvironment()` uses process environment configuration.
- `SmsModule.forTesting(options)` registers Mock.
- `SmsModule.forFeature()` reuses a global root registration.

`SMS_CONFIG` is the exported symbol for direct configuration injection.

## Service methods

- `verify(message)` submits one template SMS with the shared core contract.
- `verifyBulk(messages, options)` applies that same contract to each message with bounded
  batch concurrency.
- `createVerificationMessage(...)` creates a typed request.
- `getAvailableDrivers()` returns drivers whose configuration validates.
- `getServiceInfo()` returns sanitized static configuration and fallback status.
- `healthCheck()` checks local configuration only; it does not contact providers or assert
  provider availability/delivery health.

## Testing

```typescript
const module = await Test.createTestingModule({
  imports: [SmsModule.forTesting({ failureMode: 'rejected' })],
}).compile();
```

Mock modes are `rejected`, `timeout`, `network`, and `unexpected`.

```bash
npm test
npm run test:coverage
npm run typecheck
npm run lint:check
npm run build
```

Keep live-provider tests opt-in and inject secrets at runtime. Never put credentials,
recipient numbers, or OTPs in source files.

## License

MIT. See [LICENSE](LICENSE).
