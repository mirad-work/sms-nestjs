/**
 * Advanced configuration example for @mirad-work/sms-nestjs
 *
 * This example demonstrates advanced configuration patterns including:
 * - Custom configuration factories
 * - Multiple driver configurations
 * - Environment-specific configurations
 * - Bulk SMS operations
 * - Error handling and monitoring
 * - Testing configurations
 */

import {
  Module,
  Controller,
  Post,
  Get,
  Body,
  Logger,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  SmsModule,
  SmsService,
  ISmsMessage,
  ISmsResponse,
  ISmsConfig,
  DriverType,
  SmsOptionsFactory,
  NestSmsConfigHelper,
  SmsException,
} from '@mirad-work/sms-nestjs';

// DTOs for request validation
class SendBulkSmsDto {
  messages: Array<{
    phoneNumber: string;
    template: string;
    tokens: Record<string, unknown>;
  }>;
  options?: {
    concurrency?: number;
    failFast?: boolean;
  };
}

class SendSmsDto {
  phoneNumber: string;
  template: string;
  tokens: Record<string, unknown>;
  driver?: DriverType; // Optional specific driver
}

/**
 * Custom SMS configuration factory
 * This allows you to create complex configuration logic
 */
@Injectable()
export class SmsConfigFactory implements SmsOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createSmsOptions(): ISmsConfig {
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development'
    );

    // Different configurations for different environments
    switch (environment) {
      case 'production':
        return this.createProductionConfig();
      case 'staging':
        return this.createStagingConfig();
      case 'test':
        return this.createTestConfig();
      default:
        return this.createDevelopmentConfig();
    }
  }

  private createProductionConfig(): ISmsConfig {
    // Production typically uses real SMS providers
    return {
      defaultDriver: this.configService.get<DriverType>(
        'SMS_DEFAULT_DRIVER',
        DriverType.KAVENEGAR
      ),
      timeout: 15000, // Longer timeout for production
      fallback: {
        enabled: true,
        order: [DriverType.SMSIR],
      },
      drivers: {
        kavenegar: {
          url: this.configService.get(
            'SMS_KAVENEGAR_URL',
            'https://api.kavenegar.com/v1/'
          ),
          apiKey: this.configService.getOrThrow('SMS_KAVENEGAR_API_KEY'),
        },
        smsir: {
          url: this.configService.get(
            'SMS_SMSIR_URL',
            'https://api.sms.ir/v1/'
          ),
          apiKey: this.configService.getOrThrow('SMS_SMSIR_API_KEY'),
        },
      },
    };
  }

  private createStagingConfig(): ISmsConfig {
    // Staging might use real providers but with different settings
    return {
      defaultDriver: DriverType.MOCK, // Use mock in staging to avoid SMS costs
      timeout: 10000,
      drivers: {
        mock: {
          shouldFail: false,
          delay: 500, // Simulate realistic delay
        },
        kavenegar: {
          url: this.configService.get(
            'SMS_KAVENEGAR_URL',
            'https://api.kavenegar.com/v1/'
          ),
          apiKey: this.configService.get('SMS_KAVENEGAR_API_KEY', ''),
          lineNumber: this.configService.get('SMS_KAVENEGAR_LINE_NUMBER', ''),
        },
      },
    };
  }

  private createTestConfig(): ISmsConfig {
    // Test environment always uses mock
    return NestSmsConfigHelper.createForTesting({
      shouldFail: this.configService.get<boolean>(
        'SMS_TEST_SHOULD_FAIL',
        false
      ),
      delay: this.configService.get<number>('SMS_TEST_DELAY', 0),
    });
  }

  private createDevelopmentConfig(): ISmsConfig {
    // Development can use mock or real providers
    const useMock = this.configService.get<boolean>(
      'SMS_USE_MOCK_IN_DEV',
      true
    );

    if (useMock) {
      return this.createTestConfig();
    }

    return NestSmsConfigHelper.createFromConfigService(this.configService);
  }
}

/**
 * SMS service wrapper with advanced features
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly smsService: SmsService) {}

  /** Submit once through the core safety policy; never hand-roll retries for OTPs. */
  async sendWithFallback(
    phoneNumber: string,
    template: string,
    tokens: Record<string, unknown>,
    primaryDriver?: DriverType
  ): Promise<ISmsResponse> {
    return this.smsService.verify({
      to: phoneNumber,
      template,
      tokens,
      driver: primaryDriver,
      fallback: true,
    });
  }
}

/**
 * Advanced SMS controller with comprehensive error handling
 */
@Controller('sms')
export class SmsController {
  private readonly logger = new Logger(SmsController.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * Send single SMS with optional driver specification
   */
  @Post('send')
  async sendSms(@Body() body: SendSmsDto): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const message: ISmsMessage = {
        to: body.phoneNumber,
        template: body.template,
        tokens: body.tokens,
        driver: body.driver,
      };

      const response = await this.smsService.verify(message);

      return {
        success: response.success,
        messageId: response.messageId,
        error: response.error,
      };
    } catch (error) {
      if (error instanceof SmsException) {
        throw new HttpException(
          {
            message: 'SMS sending failed',
            error: error.message,
            code: error._code,
          },
          HttpStatus.BAD_REQUEST
        );
      }
      throw error;
    }
  }

  /**
   * Send bulk SMS messages
   */
  @Post('send-bulk')
  async sendBulkSms(@Body() body: SendBulkSmsDto) {
    try {
      const messages: ISmsMessage[] = body.messages.map(msg => ({
        to: msg.phoneNumber,
        template: msg.template,
        tokens: msg.tokens,
      }));

      const responses = await this.smsService.verifyBulk(
        messages,
        body.options
      );

      const summary = {
        total: responses.length,
        successful: responses.filter(r => r.success).length,
        failed: responses.filter(r => !r.success).length,
      };

      return {
        summary,
        responses,
      };
    } catch (error) {
      this.logger.error('Bulk SMS operation failed:', error);
      throw new HttpException(
        'Bulk SMS operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Send OTP through the configured safe fallback policy
   */
  @Post('send-otp-advanced')
  async sendAdvancedOtp(
    @Body()
    body: {
      phoneNumber: string;
      code: string;
      primaryDriver?: DriverType;
    }
  ) {
    try {
      const response = await this.notificationService.sendWithFallback(
        body.phoneNumber,
        'otp-verification',
        { code: body.code },
        body.primaryDriver
      );

      return response;
    } catch (error) {
      this.logger.error('Advanced OTP sending failed:', error);
      throw new HttpException(
        'Failed to send OTP after all attempts',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get comprehensive service status
   */
  @Get('status')
  async getStatus() {
    const health = await this.smsService.healthCheck();
    const serviceInfo = this.smsService.getServiceInfo();

    return {
      health,
      serviceInfo,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get available drivers and their status
   */
  @Get('drivers')
  async getDrivers() {
    const available = this.smsService.getAvailableDrivers();
    const defaultDriver = this.smsService.getDefaultDriver();

    const driverStatus = available.map(driver => ({
      name: driver,
      available: this.smsService.isDriverAvailable(driver),
      isDefault: driver === defaultDriver,
    }));

    return {
      defaultDriver,
      drivers: driverStatus,
    };
  }
}

/**
 * Advanced application module with custom configuration factory
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Advanced async configuration using custom factory
    SmsModule.forRootAsync({
      useClass: SmsConfigFactory,
      isGlobal: true,
    }),
  ],
  controllers: [SmsController],
  providers: [SmsConfigFactory, NotificationService],
  exports: [NotificationService], // Export for other modules
})
export class AdvancedSmsModule {}

/**
 * Example of feature-specific module
 */
@Module({
  imports: [
    SmsModule.forFeature(), // Use existing SMS configuration
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}

/**
 * Application with advanced SMS configuration
 */
@Module({
  imports: [AdvancedSmsModule],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const smsService = app.get(SmsService);
  const health = await smsService.healthCheck();

  console.log('🚀 Advanced SMS Service Status:');
  console.log(`📱 Health: ${health.status}`);
  console.log(`🔧 Default Driver: ${health.defaultDriver}`);
  console.log(`📋 Available Drivers: ${health.availableDrivers.join(', ')}`);

  await app.listen(3000);
  console.log('🚀 Application is running on: http://localhost:3000');
  console.log('📋 API Endpoints:');
  console.log('  POST /sms/send - Send single SMS');
  console.log('  POST /sms/send-bulk - Send bulk SMS');
  console.log('  POST /sms/send-otp-advanced - Send OTP with safe fallback');
  console.log('  GET /sms/status - Get service status');
  console.log('  GET /sms/drivers - Get driver information');
}

// Uncomment to run
// bootstrap();

export { bootstrap };
