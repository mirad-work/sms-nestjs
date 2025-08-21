import { ModuleMetadata, Type } from '@nestjs/common';
import { ISmsConfig } from '@mirad-work/sms-core';

/**
 * SMS module options interface for synchronous configuration
 */
export interface SmsModuleOptions {
  /**
   * SMS service configuration
   */
  config: ISmsConfig;

  /**
   * Whether the module should be global
   * @default false
   */
  isGlobal?: boolean;
}

/**
 * SMS module async options interface for asynchronous configuration
 */
export interface SmsModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Whether the module should be global
   * @default false
   */
  isGlobal?: boolean;

  /**
   * Factory function to create SMS configuration
   */
  useFactory?: (...args: any[]) => Promise<ISmsConfig> | ISmsConfig;

  /**
   * Class to be used for creating SMS configuration
   */
  useClass?: Type<SmsOptionsFactory>;

  /**
   * Existing provider to be used for SMS configuration
   */
  useExisting?: Type<SmsOptionsFactory>;

  /**
   * Injection tokens for the factory function parameters
   */
  inject?: any[];
}

/**
 * Interface for SMS options factory classes
 */
export interface SmsOptionsFactory {
  /**
   * Create SMS configuration
   */
  createSmsOptions(): Promise<ISmsConfig> | ISmsConfig;
}

/**
 * SMS module options token for dependency injection
 */
export const SMS_MODULE_OPTIONS = Symbol('SMS_MODULE_OPTIONS');

/**
 * SMS configuration token for dependency injection
 */
export const SMS_CONFIG = Symbol('SMS_CONFIG');
