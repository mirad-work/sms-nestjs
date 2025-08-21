import { Module, DynamicModule, Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISmsConfig } from '@mirad-work/sms-core';
import {
  SmsModuleOptions,
  SmsModuleAsyncOptions,
  SmsOptionsFactory,
  SMS_MODULE_OPTIONS,
  SMS_CONFIG,
} from './interfaces/sms-module-options.interface';
import { SmsService } from './sms.service';
import { NestSmsConfigHelper } from './sms.config';

/**
 * NestJS SMS Module
 * Provides SMS functionality as a NestJS module with support for both
 * synchronous and asynchronous configuration
 */
@Module({})
export class SmsModule {
  private static readonly logger = new Logger(SmsModule.name);

  /**
   * Register SMS module synchronously with direct configuration
   *
   * @param options Module options with direct SMS configuration
   * @returns Dynamic module configuration
   *
   * @example
   * ```typescript
   * SmsModule.forRoot({
   *   config: {
   *     defaultDriver: DriverType.KAVENEGAR,
   *     drivers: {
   *       kavenegar: {
   *         url: 'https://api.kavenegar.com/v1/',
   *         apiKey: 'your-api-key',
   *         lineNumber: 'your-line-number'
   *       }
   *     }
   *   },
   *   isGlobal: true
   * })
   * ```
   */
  static forRoot(options: SmsModuleOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: SMS_MODULE_OPTIONS,
        useValue: options,
      },
      {
        provide: SMS_CONFIG,
        useValue: options.config,
      },
      SmsService,
    ];

    this.logger.log('SMS Module registered with synchronous configuration');

    return {
      module: SmsModule,
      providers,
      exports: [SmsService],
      global: options.isGlobal,
    };
  }

  /**
   * Register SMS module asynchronously with factory, class, or existing provider
   *
   * @param options Async module options
   * @returns Dynamic module configuration
   *
   * @example Using factory with ConfigService:
   * ```typescript
   * SmsModule.forRootAsync({
   *   imports: [ConfigModule],
   *   useFactory: (configService: ConfigService) =>
   *     NestSmsConfigHelper.createFromConfigService(configService),
   *   inject: [ConfigService],
   *   isGlobal: true
   * })
   * ```
   *
   * @example Using class:
   * ```typescript
   * SmsModule.forRootAsync({
   *   useClass: SmsConfigService,
   *   isGlobal: true
   * })
   * ```
   */
  static forRootAsync(options: SmsModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [
      ...this.createAsyncProviders(options),
      SmsService,
    ];

    this.logger.log('SMS Module registered with asynchronous configuration');

    return {
      module: SmsModule,
      imports: options.imports || [],
      providers,
      exports: [SmsService],
      global: options.isGlobal,
    };
  }

  /**
   * Create a feature module that uses an existing SMS configuration
   * This is useful when you want to use SMS service in a feature module
   * without reconfiguring it
   *
   * @returns Dynamic module configuration for feature use
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [SmsModule.forFeature()],
   *   // ...
   * })
   * export class UserModule {}
   * ```
   */
  static forFeature(): DynamicModule {
    return {
      module: SmsModule,
      providers: [SmsService],
      exports: [SmsService],
    };
  }

  /**
   * Create SMS module with environment-based configuration
   * This is a convenience method that automatically reads configuration
   * from environment variables using NestJS ConfigService
   *
   * @param options Configuration options
   * @returns Dynamic module configuration
   *
   * @example
   * ```typescript
   * SmsModule.forEnvironment({
   *   imports: [ConfigModule.forRoot()],
   *   isGlobal: true
   * })
   * ```
   */
  static forEnvironment(
    options: {
      imports?: any[];
      isGlobal?: boolean;
    } = {}
  ): DynamicModule {
    return this.forRootAsync({
      imports: options.imports || [],
      useFactory: (configService: ConfigService) =>
        NestSmsConfigHelper.createFromConfigService(configService),
      inject: [ConfigService],
      isGlobal: options.isGlobal,
    });
  }

  /**
   * Create SMS module for testing with mock configuration
   * This automatically sets up a mock SMS service for testing
   *
   * @param options Mock configuration options
   * @returns Dynamic module configuration for testing
   *
   * @example
   * ```typescript
   * SmsModule.forTesting({
   *   shouldFail: false,
   *   delay: 100
   * })
   * ```
   */
  static forTesting(
    options: {
      shouldFail?: boolean;
      delay?: number;
      isGlobal?: boolean;
    } = {}
  ): DynamicModule {
    const config = NestSmsConfigHelper.createForTesting({
      shouldFail: options.shouldFail,
      delay: options.delay,
    });

    this.logger.log('SMS Module configured for testing with mock driver');

    return this.forRoot({
      config,
      isGlobal: options.isGlobal,
    });
  }

  /**
   * Create providers for async configuration
   */
  private static createAsyncProviders(
    options: SmsModuleAsyncOptions
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    throw new Error(
      'Invalid SMS module async configuration. Must provide useFactory, useClass, or useExisting.'
    );
  }

  /**
   * Create async options provider
   */
  private static createAsyncOptionsProvider(
    options: SmsModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: SMS_CONFIG,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    if (options.useExisting) {
      return {
        provide: SMS_CONFIG,
        useFactory: async (
          optionsFactory: SmsOptionsFactory
        ): Promise<ISmsConfig> => optionsFactory.createSmsOptions(),
        inject: [options.useExisting],
      };
    }

    if (options.useClass) {
      return {
        provide: SMS_CONFIG,
        useFactory: async (
          optionsFactory: SmsOptionsFactory
        ): Promise<ISmsConfig> => optionsFactory.createSmsOptions(),
        inject: [options.useClass],
      };
    }

    throw new Error(
      'Invalid SMS module async configuration. Must provide useFactory, useClass, or useExisting.'
    );
  }
}
