/**
 * @mirad-work/sms-nestjs - NestJS adapter for @mirad-work/sms-core
 * 
 * A comprehensive NestJS module that provides SMS functionality through
 * the @mirad-work/sms-core library with proper dependency injection, 
 * configuration management, and NestJS best practices.
 */

// Main module and service exports
export { SmsModule } from './sms.module';
export { SmsService } from './sms.service';

// Configuration utilities
export { NestSmsConfigHelper } from './sms.config';

// Interfaces and types
export {
  SmsModuleOptions,
  SmsModuleAsyncOptions,
  SmsOptionsFactory,
  SMS_MODULE_OPTIONS,
  SMS_CONFIG,
} from './interfaces/sms-module-options.interface';

// Re-export commonly used types from core library for convenience
export {
  ISmsConfig,
  ISmsMessage,
  ISmsResponse,
  ISmsDriver,
  IKavenegarConfig,
  ISmsIrConfig,
  IMelipayamakConfig,
  IMockConfig,
  DriverType,
  SmsStatus,
  HttpMethod,
  HttpRequestConfig,
  HttpResponse,
  SmsException,
  UnsupportedDriverException,
  SmsDriverException,
  ConfigurationException,
  MissingConfigException,
  MessageValidationException,
  RateLimitException,
  HttpException,
  SmsConfigManager,
  createSmsService,
  createMockSmsService,
  createKavenegarSmsService,
  createSmsIrSmsService,
  createMelipayamakSmsService,
} from '@mirad-work/sms-core';
