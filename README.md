# @mirad-work/sms-nestjs

A comprehensive NestJS adapter for [@mirad-work/sms-core](https://github.com/mirad-work/sms-core) - providing seamless SMS functionality for NestJS applications with support for multiple Iranian SMS providers.

## 🚀 Features

- **🏗️ NestJS Integration**: First-class NestJS module with dependency injection support
- **🔧 Multiple Configuration Options**: Sync, async, factory-based, and environment-based configuration
- **📱 Multi-Provider Support**: Kavenegar, SMS.ir, Melipayamak, IPPanel, and Mock (for testing)
- **🛡️ Robust Error Handling**: Comprehensive error handling with proper NestJS exceptions
- **🔄 Retry & Fallback**: Built-in retry mechanisms and fallback driver support
- **📊 Bulk Operations**: Efficient bulk SMS sending with concurrency control
- **🩺 Health Checks**: Built-in health monitoring and service status endpoints
- **📝 Comprehensive Logging**: Detailed logging for debugging and monitoring
- **🧪 Testing Ready**: Mock driver and testing utilities included
- **📖 TypeScript First**: Full TypeScript support with comprehensive type definitions

## 📦 Installation

```bash
npm install @mirad-work/sms-nestjs @mirad-work/sms-core
# or
yarn add @mirad-work/sms-nestjs @mirad-work/sms-core
```

### Peer Dependencies

Make sure you have these NestJS packages installed:

```bash
npm install @nestjs/common @nestjs/config
```

## 🏁 Quick Start

### 1. Basic Setup with Environment Variables

First, create your `.env` file:

```env
# SMS Configuration
SMS_DEFAULT_DRIVER=kavenegar
SMS_TIMEOUT=10000

# Kavenegar Configuration
SMS_KAVENEGAR_API_KEY=your-kavenegar-api-key
SMS_KAVENEGAR_LINE_NUMBER=your-line-number

# Or for SMS.ir
# SMS_DEFAULT_DRIVER=smsir
# SMS_SMSIR_API_KEY=your-smsir-api-key
# SMS_SMSIR_LINE_NUMBER=your-line-number
```

### 2. Configure Your Module

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmsModule } from '@mirad-work/sms-nestjs';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SmsModule.forEnvironment({ isGlobal: true }),
  ],
})
export class AppModule {}
```

### 3. Use in Your Service

```typescript
import { Injectable } from '@nestjs/common';
import { SmsService } from '@mirad-work/sms-nestjs';

@Injectable()
export class AuthService {
  constructor(private readonly smsService: SmsService) {}

  async sendOtp(phoneNumber: string, code: string) {
    const message = this.smsService.createVerificationMessage(
      phoneNumber,
      'otp-verification', // Your template name
      { code } // Template variables
    );

    return await this.smsService.verify(message);
  }
}
```

## 📋 Configuration Options

### Environment-based Configuration (Recommended)

```typescript
import { SmsModule } from '@mirad-work/sms-nestjs';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SmsModule.forEnvironment({ isGlobal: true }),
  ],
})
export class AppModule {}
```

### Synchronous Configuration

```typescript
import { SmsModule, DriverType } from '@mirad-work/sms-nestjs';

@Module({
  imports: [
    SmsModule.forRoot({
      config: {
        defaultDriver: DriverType.KAVENEGAR,
        timeout: 10000,
        drivers: {
          kavenegar: {
            url: 'https://api.kavenegar.com/v1/',
            apiKey: 'your-api-key',
            lineNumber: 'your-line-number',
          },
        },
      },
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

### Asynchronous Configuration with Factory

```typescript
import { SmsModule, NestSmsConfigHelper } from '@mirad-work/sms-nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SmsModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        NestSmsConfigHelper.createFromConfigService(configService),
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

### Custom Configuration Factory

```typescript
import { Injectable } from '@nestjs/common';
import { 
  SmsOptionsFactory, 
  SmsModule, 
  NestSmsConfigHelper 
} from '@mirad-work/sms-nestjs';
import { ConfigService } from '@nestjs/config';
import { ISmsConfig } from '@mirad-work/sms-core';

@Injectable()
export class SmsConfigService implements SmsOptionsFactory {
  constructor(private configService: ConfigService) {}

  createSmsOptions(): ISmsConfig {
    const environment = this.configService.get('NODE_ENV');
    
    if (environment === 'test') {
      return NestSmsConfigHelper.createForTesting();
    }
    
    return NestSmsConfigHelper.createFromConfigService(this.configService);
  }
}

@Module({
  imports: [
    SmsModule.forRootAsync({
      useClass: SmsConfigService,
      isGlobal: true,
    }),
  ],
  providers: [SmsConfigService],
})
export class AppModule {}
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SMS_DEFAULT_DRIVER` | Default SMS driver | `kavenegar` |
| `SMS_TIMEOUT` | Request timeout (ms) | `10000` |
| **Kavenegar** |
| `SMS_KAVENEGAR_URL` | Kavenegar API URL | `https://api.kavenegar.com/v1/` |
| `SMS_KAVENEGAR_API_KEY` | Kavenegar API key | - |
| `SMS_KAVENEGAR_LINE_NUMBER` | Kavenegar line number | - |
| **SMS.ir** |
| `SMS_SMSIR_URL` | SMS.ir API URL | `https://api.sms.ir/v1/` |
| `SMS_SMSIR_API_KEY` | SMS.ir API key | - |
| `SMS_SMSIR_LINE_NUMBER` | SMS.ir line number | - |
| **Melipayamak** |
| `SMS_MELIPAYAMAK_URL` | Melipayamak API URL | `https://console.melipayamak.com/api/` |
| `SMS_MELIPAYAMAK_API_KEY` | Melipayamak API key | - |
| `SMS_MELIPAYAMAK_LINE_NUMBER` | Melipayamak line number | - |
| **IPPanel** |
| `SMS_IPPANEL_URL` | IPPanel API URL | `https://api2.ippanel.com/` |
| `SMS_IPPANEL_API_KEY` | IPPanel API key | - |
| `SMS_IPPANEL_LINE_NUMBER` | IPPanel line number | - |
| **Mock (Testing)** |
| `SMS_USE_MOCK` | Use mock driver | `false` |
| `SMS_MOCK_SHOULD_FAIL` | Mock driver should fail | `false` |
| `SMS_MOCK_DELAY` | Mock driver delay (ms) | `0` |

## 🚀 Usage Examples

### Basic SMS Sending

```typescript
@Injectable()
export class NotificationService {
  constructor(private smsService: SmsService) {}

  async sendWelcome(phoneNumber: string, name: string) {
    const response = await this.smsService.verify({
      to: phoneNumber,
      template: 'welcome',
      tokens: { name },
    });

    if (response.success) {
      console.log(`Welcome SMS sent: ${response.messageId}`);
    } else {
      console.error(`Failed to send SMS: ${response.error}`);
    }

    return response;
  }
}
```

### Bulk SMS Operations

```typescript
async sendBulkNotifications(recipients: Array<{phone: string, code: string}>) {
  const messages = recipients.map(recipient => ({
    to: recipient.phone,
    template: 'otp-verification',
    tokens: { code: recipient.code },
  }));

  const responses = await this.smsService.verifyBulk(messages, {
    concurrency: 5, // Send 5 at a time
    failFast: false, // Continue even if some fail
  });

  const successful = responses.filter(r => r.success).length;
  console.log(`Sent ${successful}/${responses.length} SMS messages`);

  return responses;
}
```

### Health Monitoring

```typescript
@Controller('health')
export class HealthController {
  constructor(private smsService: SmsService) {}

  @Get('sms')
  async checkSmsHealth() {
    const health = await this.smsService.healthCheck();
    
    if (health.status === 'unhealthy') {
      throw new ServiceUnavailableException('SMS service is unhealthy');
    }
    
    return health;
  }
}
```

### Advanced Error Handling

```typescript
@Injectable()
export class SmsNotificationService {
  constructor(private smsService: SmsService) {}

  async sendWithRetry(phoneNumber: string, template: string, tokens: any) {
    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.smsService.verify({
          to: phoneNumber,
          template,
          tokens,
        });

        if (response.success) {
          return response;
        } else {
          // Provider returned error - don't retry
          throw new Error(response.error || 'SMS sending failed');
        }
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## 🧪 Testing

### Setup for Testing

```typescript
import { Test } from '@nestjs/testing';
import { SmsModule, SmsService } from '@mirad-work/sms-nestjs';

describe('MyService', () => {
  let smsService: SmsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        SmsModule.forTesting({
          shouldFail: false, // Control if SMS should succeed/fail
          delay: 100,        // Simulate network delay
        }),
      ],
      providers: [MyService],
    }).compile();

    smsService = module.get<SmsService>(SmsService);
  });

  it('should send SMS successfully', async () => {
    const response = await smsService.verify({
      to: '+989123456789',
      template: 'test-template',
      tokens: { code: '123456' },
    });

    expect(response.success).toBe(true);
    expect(response.messageId).toBeDefined();
  });
});
```

### Mock Specific Scenarios

```typescript
// Test failure scenarios
const failingModule = await Test.createTestingModule({
  imports: [
    SmsModule.forTesting({
      shouldFail: true,  // All SMS will fail
      delay: 0,
    }),
  ],
}).compile();

// Test with realistic delays
const realisticModule = await Test.createTestingModule({
  imports: [
    SmsModule.forTesting({
      shouldFail: false,
      delay: 500,  // 500ms delay to simulate real network
    }),
  ],
}).compile();
```

## 📊 API Reference

### SmsService Methods

#### `verify(message: ISmsMessage): Promise<ISmsResponse>`
Send a verification SMS (OTP, etc.)

#### `verifyBulk(messages: ISmsMessage[], options?): Promise<ISmsResponse[]>`
Send multiple SMS messages with concurrency control

#### `createVerificationMessage(to, template, tokens, options?): ISmsMessage`
Create a properly formatted SMS message object

#### `getAvailableDrivers(): DriverType[]`
Get list of available/configured drivers

#### `isDriverAvailable(driver: DriverType): boolean`
Check if a specific driver is available

#### `getDefaultDriver(): DriverType`
Get the default driver configured

#### `getServiceInfo(): ServiceInfo`
Get comprehensive service information

#### `healthCheck(): Promise<HealthStatus>`
Perform service health check

### Configuration Helpers

#### `NestSmsConfigHelper.createFromConfigService(configService): ISmsConfig`
Create configuration from NestJS ConfigService

#### `NestSmsConfigHelper.createForTesting(options?): ISmsConfig`
Create configuration for testing with mock driver

#### `NestSmsConfigHelper.validateDriverEnvironment(driver, configService): boolean`
Validate required environment variables for a driver

## 🔍 Troubleshooting

### Common Issues

1. **Module not found errors**
   ```bash
   npm install @mirad-work/sms-core
   ```

2. **Configuration validation errors**
   ```typescript
   // Check required environment variables
   const missing = NestSmsConfigHelper.getMissingEnvironmentVars(
     DriverType.KAVENEGAR, 
     configService
   );
   console.log('Missing vars:', missing);
   ```

3. **SMS not sending**
   ```typescript
   // Check service health
   const health = await smsService.healthCheck();
   console.log('Service status:', health);
   
   // Check available drivers
   const drivers = smsService.getAvailableDrivers();
   console.log('Available drivers:', drivers);
   ```

### Debug Mode

Enable debug logging in your NestJS application:

```typescript
// main.ts
import { Logger } from '@nestjs/common';

const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'log', 'debug'], // Enable debug logs
});
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](https://github.com/mirad-work/sms-core/blob/main/CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/mirad-work/sms-nestjs
cd sms-nestjs

# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:cov
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 About Mirad Work

This package is maintained by [Mirad Work Organization](https://mirad.work) - building quality open-source tools for the Persian/Iranian developer community.

## 📞 Support

- 📧 Email: [opensource@mirad-work.work](mailto:opensource@mirad-work.work)
- 🐛 Issues: [GitHub Issues](https://github.com/mirad-work/sms-nestjs/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/mirad-work/sms-core/discussions)

## 🙏 Acknowledgments

- [@mirad-work/sms-core](https://github.com/mirad-work/sms-core) - The core SMS library
- [NestJS](https://nestjs.com) - The progressive Node.js framework
- All SMS provider APIs for their services

---

<p align="center">Made with ❤️ for the NestJS community</p>
