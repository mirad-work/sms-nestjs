import { ConfigService } from '@nestjs/config';
import { ISmsConfig, SmsConfigManager, DriverType } from '@mirad-work/sms-core';

/**
 * NestJS configuration helper for SMS service
 * Provides utilities to create SMS configurations from NestJS ConfigService
 */
export class NestSmsConfigHelper {
  /**
   * Create SMS configuration from NestJS ConfigService
   * This method reads environment variables using NestJS ConfigService
   * and creates a proper ISmsConfig object
   */
  static createFromConfigService(configService: ConfigService): ISmsConfig {
    const defaultDriver = configService.get<DriverType>(
      'SMS_DEFAULT_DRIVER',
      DriverType.KAVENEGAR
    );
    const timeout = parseInt(
      configService.get<string>('SMS_TIMEOUT', '10000'),
      10
    );

    const config: ISmsConfig = {
      defaultDriver,
      timeout,
      drivers: {},
    };

    // Kavenegar configuration
    const kavenegarUrl = configService.get<string>('SMS_KAVENEGAR_URL');
    const kavenegarApiKey = configService.get<string>('SMS_KAVENEGAR_API_KEY');
    const kavenegarLineNumber = configService.get<string>(
      'SMS_KAVENEGAR_LINE_NUMBER'
    );

    if (kavenegarUrl || kavenegarApiKey) {
      config.drivers.kavenegar = {
        url: kavenegarUrl || 'https://api.kavenegar.com/v1/',
        apiKey: kavenegarApiKey || '',
        lineNumber: kavenegarLineNumber || '',
      };
    }

    // SMS.ir configuration
    const smsirUrl = configService.get<string>('SMS_SMSIR_URL');
    const smsirApiKey = configService.get<string>('SMS_SMSIR_API_KEY');
    const smsirLineNumber = configService.get<string>('SMS_SMSIR_LINE_NUMBER');

    if (smsirUrl || smsirApiKey) {
      config.drivers.smsir = {
        url: smsirUrl || 'https://api.sms.ir/v1/',
        apiKey: smsirApiKey || '',
        lineNumber: smsirLineNumber || '',
      };
    }

    // Melipayamak configuration
    const melipayamakUrl = configService.get<string>('SMS_MELIPAYAMAK_URL');
    const melipayamakApiKey = configService.get<string>(
      'SMS_MELIPAYAMAK_API_KEY'
    );
    const melipayamakLineNumber = configService.get<string>(
      'SMS_MELIPAYAMAK_LINE_NUMBER'
    );

    if (melipayamakUrl || melipayamakApiKey) {
      config.drivers.melipayamak = {
        url: melipayamakUrl || 'https://console.melipayamak.com/api/',
        apiKey: melipayamakApiKey || '',
        lineNumber: melipayamakLineNumber || '',
      };
    }

    // IPPanel configuration
    const ippanelUrl = configService.get<string>('SMS_IPPANEL_URL');
    const ippanelApiKey = configService.get<string>('SMS_IPPANEL_API_KEY');
    const ippanelLineNumber = configService.get<string>(
      'SMS_IPPANEL_LINE_NUMBER'
    );

    if (ippanelUrl || ippanelApiKey) {
      config.drivers.ippanel = {
        url: ippanelUrl || 'https://api2.ippanel.com/',
        apiKey: ippanelApiKey || '',
        lineNumber: ippanelLineNumber || '',
      };
    }

    // Mock driver configuration (for testing)
    const nodeEnv = configService.get<string>('NODE_ENV');
    const useMock = configService.get<string>('SMS_USE_MOCK');

    if (nodeEnv === 'test' || useMock === 'true') {
      config.drivers.mock = {
        shouldFail:
          configService.get<string>('SMS_MOCK_SHOULD_FAIL') === 'true',
        delay: parseInt(configService.get<string>('SMS_MOCK_DELAY', '0'), 10),
      };
    }

    return config;
  }

  /**
   * Create a configuration factory function for NestJS async module setup
   * This is commonly used with useFactory in forRootAsync
   */
  static createAsyncFactory(configService: ConfigService): ISmsConfig {
    return NestSmsConfigHelper.createFromConfigService(configService);
  }

  /**
   * Create SMS configuration for development/testing
   * Uses mock driver by default with sensible test defaults
   */
  static createForTesting(
    options: {
      shouldFail?: boolean;
      delay?: number;
    } = {}
  ): ISmsConfig {
    return SmsConfigManager.createForTesting(options);
  }

  /**
   * Create configuration with environment variables fallback
   * Uses NestJS ConfigService first, then falls back to process.env
   */
  static createWithFallback(configService?: ConfigService): ISmsConfig {
    if (configService) {
      return NestSmsConfigHelper.createFromConfigService(configService);
    }
    return SmsConfigManager.fromEnvironment();
  }

  /**
   * Validate that required environment variables are set for a specific driver
   */
  static validateDriverEnvironment(
    driverType: DriverType,
    configService: ConfigService
  ): boolean {
    switch (driverType) {
      case DriverType.KAVENEGAR:
        return Boolean(
          configService.get('SMS_KAVENEGAR_API_KEY') &&
            configService.get('SMS_KAVENEGAR_LINE_NUMBER')
        );

      case DriverType.SMSIR:
        return Boolean(
          configService.get('SMS_SMSIR_API_KEY') &&
            configService.get('SMS_SMSIR_LINE_NUMBER')
        );

      case DriverType.MELIPAYAMAK:
        return Boolean(
          configService.get('SMS_MELIPAYAMAK_API_KEY') &&
            configService.get('SMS_MELIPAYAMAK_LINE_NUMBER')
        );

      case DriverType.IPPANEL:
        return Boolean(
          configService.get('SMS_IPPANEL_API_KEY') &&
            configService.get('SMS_IPPANEL_LINE_NUMBER')
        );

      case DriverType.MOCK:
        return true; // Mock driver doesn't require specific env vars

      default:
        return false;
    }
  }

  /**
   * Get list of missing environment variables for a driver
   */
  static getMissingEnvironmentVars(
    driverType: DriverType,
    configService: ConfigService
  ): string[] {
    const missing: string[] = [];

    switch (driverType) {
      case DriverType.KAVENEGAR:
        if (!configService.get('SMS_KAVENEGAR_API_KEY')) {
          missing.push('SMS_KAVENEGAR_API_KEY');
        }
        if (!configService.get('SMS_KAVENEGAR_LINE_NUMBER')) {
          missing.push('SMS_KAVENEGAR_LINE_NUMBER');
        }
        break;

      case DriverType.SMSIR:
        if (!configService.get('SMS_SMSIR_API_KEY')) {
          missing.push('SMS_SMSIR_API_KEY');
        }
        if (!configService.get('SMS_SMSIR_LINE_NUMBER')) {
          missing.push('SMS_SMSIR_LINE_NUMBER');
        }
        break;

      case DriverType.MELIPAYAMAK:
        if (!configService.get('SMS_MELIPAYAMAK_API_KEY')) {
          missing.push('SMS_MELIPAYAMAK_API_KEY');
        }
        if (!configService.get('SMS_MELIPAYAMAK_LINE_NUMBER')) {
          missing.push('SMS_MELIPAYAMAK_LINE_NUMBER');
        }
        break;

      case DriverType.IPPANEL:
        if (!configService.get('SMS_IPPANEL_API_KEY')) {
          missing.push('SMS_IPPANEL_API_KEY');
        }
        if (!configService.get('SMS_IPPANEL_LINE_NUMBER')) {
          missing.push('SMS_IPPANEL_LINE_NUMBER');
        }
        break;
    }

    return missing;
  }

  /**
   * Get sample environment variables with NestJS configuration documentation
   */
  static getSampleEnvConfiguration(): string {
    return `
# SMS Service Configuration for NestJS
# Place these variables in your .env file or configure them through ConfigModule

# Default SMS driver to use
SMS_DEFAULT_DRIVER=kavenegar

# Global timeout for SMS requests (milliseconds)
SMS_TIMEOUT=10000

# Kavenegar Configuration
SMS_KAVENEGAR_URL=https://api.kavenegar.com/v1/
SMS_KAVENEGAR_API_KEY=your-kavenegar-api-key
SMS_KAVENEGAR_LINE_NUMBER=your-kavenegar-line-number

# SMS.ir Configuration  
SMS_SMSIR_URL=https://api.sms.ir/v1/
SMS_SMSIR_API_KEY=your-smsir-api-key
SMS_SMSIR_LINE_NUMBER=your-smsir-line-number

# Melipayamak Configuration
SMS_MELIPAYAMAK_URL=https://console.melipayamak.com/api/
SMS_MELIPAYAMAK_API_KEY=your-melipayamak-api-key
SMS_MELIPAYAMAK_LINE_NUMBER=your-melipayamak-line-number

# IPPanel Configuration
SMS_IPPANEL_URL=https://api2.ippanel.com/
SMS_IPPANEL_API_KEY=your-ippanel-api-key
SMS_IPPANEL_LINE_NUMBER=your-ippanel-line-number

# Mock Driver Configuration (for testing)
SMS_USE_MOCK=false
SMS_MOCK_SHOULD_FAIL=false
SMS_MOCK_DELAY=0
`.trim();
  }
}
