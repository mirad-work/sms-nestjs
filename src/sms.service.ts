import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SmsService as CoreSmsService,
  ISmsMessage,
  ISmsResponse,
  ISmsConfig,
  DriverType,
  SmsException,
} from '@mirad-work/sms-core';

/**
 * NestJS SMS Service wrapper
 * Provides SMS functionality as a NestJS injectable service
 *
 * This service wraps the core SMS service and integrates it with NestJS dependency injection,
 * logging, and error handling patterns.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly coreService: CoreSmsService;

  constructor(@Inject('SMS_CONFIG') private readonly config: ISmsConfig) {
    this.coreService = new CoreSmsService(config);
    this.logger.log(
      'SMS Service initialized with default driver: ' + config.defaultDriver
    );
  }

  /**
   * Factory function to create SmsService instance
   * This is used to work around Jest dependency injection issues
   */
  static create(config: ISmsConfig): SmsService {
    return new SmsService(config);
  }

  /**
   * Send a template-based SMS message (OTP, verification codes, etc.)
   *
   * @param message SMS message configuration
   * @returns Promise resolving to SMS response
   *
   * @example
   * ```typescript
   * const response = await smsService.verify({
   *   to: '+989123456789',
   *   template: 'otp-verification',
   *   tokens: { code: '123456', appName: 'MyApp' }
   * });
   * ```
   */
  async verify(message: ISmsMessage): Promise<ISmsResponse> {
    const startTime = Date.now();

    try {
      this.logger.debug(
        `Sending verification SMS to ${message.to} using template ${message.template}`
      );

      const response = await this.coreService.verify(message);

      const duration = Date.now() - startTime;

      if (response.success) {
        this.logger.log(
          `SMS sent successfully to ${message.to} in ${duration}ms (ID: ${response.messageId})`
        );
      } else {
        this.logger.warn(
          `SMS sending failed for ${message.to}: ${response.error} (${response.errorCode})`
        );
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof SmsException) {
        this.logger.error(
          `SMS sending failed for ${message.to} after ${duration}ms: ${error.message}`,
          error.stack
        );
      } else {
        this.logger.error(
          `Unexpected error sending SMS to ${message.to} after ${duration}ms`,
          error instanceof Error ? error.stack : String(error)
        );
      }

      throw error;
    }
  }

  /**
   * Create a verification message object with proper validation
   *
   * @param to Recipient phone number
   * @param template Template identifier
   * @param tokens Template variables/tokens
   * @param options Additional options
   * @returns Constructed SMS message object
   */
  createVerificationMessage(
    to: string,
    template: string,
    tokens: Record<string, unknown> | unknown[],
    options: {
      driver?: DriverType;
    } = {}
  ): ISmsMessage {
    return this.coreService.createVerificationMessage(
      to,
      template,
      tokens,
      options
    );
  }

  /**
   * Get list of available SMS drivers
   *
   * @returns Array of available driver types
   */
  getAvailableDrivers(): DriverType[] {
    return this.coreService.getAvailableDrivers();
  }

  /**
   * Check if a specific driver is available and configured
   *
   * @param driverType Driver type to check
   * @returns True if driver is available
   */
  isDriverAvailable(driverType: DriverType): boolean {
    return this.coreService.isDriverAvailable(driverType);
  }

  /**
   * Get the default driver type configured for this service
   *
   * @returns Default driver type
   */
  getDefaultDriver(): DriverType {
    return this.coreService.getDefaultDriver();
  }

  /**
   * Get current service configuration (for debugging/monitoring)
   * Note: Sensitive information like API keys are excluded
   *
   * @returns Sanitized configuration information
   */
  getServiceInfo(): {
    defaultDriver: DriverType;
    availableDrivers: DriverType[];
    timeout: number;
    driversConfigured: string[];
  } {
    return {
      defaultDriver: this.getDefaultDriver(),
      availableDrivers: this.getAvailableDrivers(),
      timeout: this.config.timeout || 10000,
      driversConfigured: Object.keys(this.config.drivers).filter(
        key => this.config.drivers[key as DriverType]
      ),
    };
  }

  /**
   * Health check method for monitoring
   * Returns the service status and basic configuration info
   *
   * @returns Service health information
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    defaultDriver: DriverType;
    availableDrivers: DriverType[];
    timestamp: string;
    error?: string;
  }> {
    try {
      const serviceInfo = this.getServiceInfo();

      return {
        status: 'healthy',
        defaultDriver: serviceInfo.defaultDriver,
        availableDrivers: serviceInfo.availableDrivers,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('SMS Service health check failed', error);

      return {
        status: 'unhealthy',
        defaultDriver: this.config.defaultDriver,
        availableDrivers: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send multiple verification messages concurrently
   * Useful for bulk operations with proper error handling
   *
   * @param messages Array of SMS messages to send
   * @param options Bulk sending options
   * @returns Array of responses corresponding to input messages
   */
  async verifyBulk(
    messages: ISmsMessage[],
    options: {
      concurrency?: number;
      failFast?: boolean;
    } = {}
  ): Promise<ISmsResponse[]> {
    const { concurrency = 5, failFast = false } = options;

    this.logger.debug(
      `Sending ${messages.length} SMS messages with concurrency ${concurrency}`
    );

    const results: ISmsResponse[] = [];

    // Process messages in batches
    for (let i = 0; i < messages.length; i += concurrency) {
      const batch = messages.slice(i, i + concurrency);

      const batchPromises = batch.map(async (message, index) => {
        try {
          const response = await this.verify(message);
          return { index: i + index, response };
        } catch (error) {
          const errorResponse: ISmsResponse = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            errorCode:
              error instanceof SmsException ? error._code : 'UNKNOWN_ERROR',
          };

          if (failFast) {
            throw error;
          }

          return { index: i + index, response: errorResponse };
        }
      });

      try {
        const batchResults = await Promise.all(batchPromises);

        // Place results in correct order
        batchResults.forEach(({ index, response }) => {
          results[index] = response;
        });
      } catch (error) {
        if (failFast) {
          throw error;
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    this.logger.log(
      `Bulk SMS completed: ${successCount}/${messages.length} successful`
    );

    return results;
  }
}
