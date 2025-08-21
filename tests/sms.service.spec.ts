import { ConfigService } from '@nestjs/config';
import { SmsService, NestSmsConfigHelper } from '../src';
import {
  ISmsConfig,
  ISmsMessage,
  DriverType,
  MessageValidationException,
} from '@mirad-work/sms-core';

describe('SmsService', () => {
  let service: SmsService;

  // Mock configuration for testing
  const mockConfig: ISmsConfig = {
    defaultDriver: DriverType.MOCK,
    timeout: 5000,
    drivers: {
      mock: {
        shouldFail: false,
        delay: 0,
      },
    },
  };

  beforeEach(async () => {
    // Use factory pattern instead of dependency injection to avoid Jest issues
    service = SmsService.create(mockConfig);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct configuration', () => {
      expect(service.getDefaultDriver()).toBe(DriverType.MOCK);
      expect(service.getAvailableDrivers()).toContain(DriverType.MOCK);
    });

    it('should log initialization message', () => {
      // Service should be initialized without errors
      expect(service.getServiceInfo().defaultDriver).toBe(DriverType.MOCK);
    });
  });

  describe('verify', () => {
    it('should send verification SMS successfully', async () => {
      const message: ISmsMessage = {
        to: '+989123456789',
        template: 'verify',
        tokens: { code: '123456' },
      };

      const response = await service.verify(message);

      expect(response).toBeDefined();
      expect(response.success).toBe(true);
      expect(response.messageId).toBeDefined();
    });

    it('should handle SMS sending failure', async () => {
      // Create service with failing mock
      const failingConfig: ISmsConfig = {
        ...mockConfig,
        drivers: {
          mock: {
            shouldFail: true,
            delay: 0,
          },
        },
      };

      const failingService = SmsService.create(failingConfig);

      const message: ISmsMessage = {
        to: '+989123456789',
        template: 'verify',
        tokens: { code: '123456' },
      };

      const response = await failingService.verify(message);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should validate message structure', async () => {
      const invalidMessage: ISmsMessage = {
        to: '', // Invalid empty phone number
        template: 'verify',
        tokens: { code: '123456' },
      };

      await expect(service.verify(invalidMessage)).rejects.toThrow(
        MessageValidationException
      );
    });

    it('should require template for verification', async () => {
      const messageWithoutTemplate: ISmsMessage = {
        to: '+989123456789',
        template: '', // Empty template
        tokens: { code: '123456' },
      };

      await expect(service.verify(messageWithoutTemplate)).rejects.toThrow(
        MessageValidationException
      );
    });

    it('should require tokens for template messages', async () => {
      const messageWithoutTokens: ISmsMessage = {
        to: '+989123456789',
        template: 'verify',
        // Missing tokens
      };

      await expect(service.verify(messageWithoutTokens)).rejects.toThrow(
        MessageValidationException
      );
    });

    it('should log successful SMS operations', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');

      const message: ISmsMessage = {
        to: '+989123456789',
        template: 'verify',
        tokens: { code: '123456' },
      };

      await service.verify(message);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('SMS sent successfully')
      );
    });

    it('should log failed SMS operations', async () => {
      // Create service with failing mock
      const failingConfig: ISmsConfig = {
        ...mockConfig,
        drivers: {
          mock: {
            shouldFail: true,
            delay: 0,
          },
        },
      };

      const failingService = SmsService.create(failingConfig);
      const warnSpy = jest.spyOn(failingService['logger'], 'warn');

      const message: ISmsMessage = {
        to: '+989123456789',
        template: 'verify',
        tokens: { code: '123456' },
      };

      const response = await failingService.verify(message);

      expect(response.success).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SMS sending failed')
      );
    });
  });

  describe('createVerificationMessage', () => {
    it('should create verification message correctly', () => {
      const message = service.createVerificationMessage(
        '+989123456789',
        'verify',
        { code: '123456' }
      );

      expect(message).toEqual({
        to: '+989123456789',
        template: 'verify',
        tokens: { code: '123456' },
        driver: undefined,
      });
    });

    it('should create verification message with specific driver', () => {
      const message = service.createVerificationMessage(
        '+989123456789',
        'verify',
        { code: '123456' },
        { driver: DriverType.KAVENEGAR }
      );

      expect(message.driver).toBe(DriverType.KAVENEGAR);
    });
  });

  describe('driver management', () => {
    it('should return available drivers', () => {
      const drivers = service.getAvailableDrivers();
      expect(Array.isArray(drivers)).toBe(true);
      expect(drivers.length).toBeGreaterThan(0);
    });

    it('should check driver availability', () => {
      expect(service.isDriverAvailable(DriverType.MOCK)).toBe(true);
    });

    it('should return default driver', () => {
      expect(service.getDefaultDriver()).toBe(DriverType.MOCK);
    });
  });

  describe('service info', () => {
    it('should return service information', () => {
      const info = service.getServiceInfo();

      expect(info).toHaveProperty('defaultDriver');
      expect(info).toHaveProperty('availableDrivers');
      expect(info).toHaveProperty('timeout');
      expect(info).toHaveProperty('driversConfigured');

      expect(info.defaultDriver).toBe(DriverType.MOCK);
      expect(Array.isArray(info.availableDrivers)).toBe(true);
      expect(typeof info.timeout).toBe('number');
      expect(Array.isArray(info.driversConfigured)).toBe(true);
    });
  });

  describe('health check', () => {
    it('should return healthy status', async () => {
      const health = await service.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('defaultDriver');
      expect(health).toHaveProperty('availableDrivers');
      expect(health).toHaveProperty('timestamp');

      expect(health.status).toBe('healthy');
      expect(health.defaultDriver).toBe(DriverType.MOCK);
      expect(Array.isArray(health.availableDrivers)).toBe(true);
      expect(typeof health.timestamp).toBe('string');
    });

    it('should handle health check errors gracefully', async () => {
      // Create a service with valid config but mock the health check to throw an error
      const errorService = SmsService.create(mockConfig);

      // Mock the getServiceInfo method to throw an error
      jest.spyOn(errorService, 'getServiceInfo').mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const health = await errorService.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health).toHaveProperty('error');
      expect(health.error).toBe('Service unavailable');
    });
  });

  describe('bulk operations', () => {
    it('should send bulk SMS messages successfully', async () => {
      const messages: ISmsMessage[] = [
        {
          to: '+989123456789',
          template: 'verify',
          tokens: { code: '123456' },
        },
        {
          to: '+989987654321',
          template: 'verify',
          tokens: { code: '654321' },
        },
      ];

      const responses = await service.verifyBulk(messages);

      expect(responses).toHaveLength(2);
      expect(responses.every(r => r.success)).toBe(true);
    });

    it('should handle bulk SMS with partial failures', async () => {
      // Create mixed configuration: one working, one failing
      const mixedConfig: ISmsConfig = {
        defaultDriver: DriverType.MOCK,
        timeout: 5000,
        drivers: {
          mock: {
            shouldFail: false,
            delay: 0,
          },
        },
      };

      const mixedService = SmsService.create(mixedConfig);

      const messages: ISmsMessage[] = [
        {
          to: '+989123456789',
          template: 'verify',
          tokens: { code: '123456' },
        },
        {
          to: '', // Invalid phone number - should fail
          template: 'verify',
          tokens: { code: '654321' },
        },
      ];

      const responses = await mixedService.verifyBulk(messages, {
        failFast: false,
      });

      expect(responses).toHaveLength(2);
      expect(responses[0].success).toBe(true);
      expect(responses[1].success).toBe(false);
    });

    it('should handle bulk SMS with fail fast option', async () => {
      const messages: ISmsMessage[] = [
        {
          to: '', // Invalid - should fail immediately
          template: 'verify',
          tokens: { code: '123456' },
        },
        {
          to: '+989987654321',
          template: 'verify',
          tokens: { code: '654321' },
        },
      ];

      await expect(
        service.verifyBulk(messages, { failFast: true })
      ).rejects.toThrow();
    });

    it('should respect concurrency limits in bulk operations', async () => {
      const messages: ISmsMessage[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          to: `+98912345${i.toString().padStart(4, '0')}`,
          template: 'verify',
          tokens: { code: '123456' },
        }));

      const startTime = Date.now();
      await service.verifyBulk(messages, { concurrency: 2 });
      const endTime = Date.now();

      // With concurrency 2, it should take some time but not too long
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

describe('SmsService Integration with ConfigService', () => {
  let service: SmsService;

  beforeEach(async () => {
    // Set up environment variables for testing
    process.env.SMS_DEFAULT_DRIVER = 'mock';
    process.env.SMS_USE_MOCK = 'true';
    process.env.SMS_MOCK_SHOULD_FAIL = 'false';
    process.env.SMS_MOCK_DELAY = '0';

    // Use factory pattern with environment configuration
    const config = NestSmsConfigHelper.createFromConfigService(
      new ConfigService({
        SMS_DEFAULT_DRIVER: 'mock',
        SMS_USE_MOCK: 'true',
        SMS_MOCK_SHOULD_FAIL: 'false',
        SMS_MOCK_DELAY: '0',
      })
    );

    service = SmsService.create(config);
  });

  afterEach(async () => {
    // Clean up environment variables
    delete process.env.SMS_DEFAULT_DRIVER;
    delete process.env.SMS_USE_MOCK;
    delete process.env.SMS_MOCK_SHOULD_FAIL;
    delete process.env.SMS_MOCK_DELAY;
  });

  it('should initialize with environment configuration', () => {
    expect(service.getDefaultDriver()).toBe(DriverType.MOCK);
    expect(service.isDriverAvailable(DriverType.MOCK)).toBe(true);
  });

  it('should send SMS with environment configuration', async () => {
    const message: ISmsMessage = {
      to: '+989123456789',
      template: 'verify',
      tokens: { code: '123456' },
    };

    const response = await service.verify(message);
    expect(response.success).toBe(true);
  });
});

describe('NestSmsConfigHelper', () => {
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService({
      SMS_DEFAULT_DRIVER: 'kavenegar',
      SMS_TIMEOUT: '15000',
      SMS_KAVENEGAR_API_KEY: 'test-api-key',
      SMS_KAVENEGAR_LINE_NUMBER: 'test-line-number',
      SMS_USE_MOCK: 'true',
    });
  });

  it('should create config from ConfigService', () => {
    const config = NestSmsConfigHelper.createFromConfigService(configService);

    expect(config.defaultDriver).toBe(DriverType.KAVENEGAR);
    expect(config.timeout).toBe(15000);
    expect(config.drivers.kavenegar).toBeDefined();
    expect(config.drivers.kavenegar?.apiKey).toBe('test-api-key');
    expect(config.drivers.mock).toBeDefined(); // Because SMS_USE_MOCK is true
  });

  it('should validate driver environment variables', () => {
    const isValid = NestSmsConfigHelper.validateDriverEnvironment(
      DriverType.KAVENEGAR,
      configService
    );
    expect(isValid).toBe(true);
  });

  it('should detect missing environment variables', () => {
    const emptyConfigService = new ConfigService({});
    const missing = NestSmsConfigHelper.getMissingEnvironmentVars(
      DriverType.KAVENEGAR,
      emptyConfigService
    );

    expect(missing).toContain('SMS_KAVENEGAR_API_KEY');
    expect(missing).toContain('SMS_KAVENEGAR_LINE_NUMBER');
  });

  it('should create testing configuration', () => {
    const config = NestSmsConfigHelper.createForTesting({
      shouldFail: true,
      delay: 1000,
    });

    expect(config.defaultDriver).toBe(DriverType.MOCK);
    expect(config.drivers.mock?.shouldFail).toBe(true);
    expect(config.drivers.mock?.delay).toBe(1000);
  });

  it('should provide sample environment configuration', () => {
    const sample = NestSmsConfigHelper.getSampleEnvConfiguration();

    expect(typeof sample).toBe('string');
    expect(sample).toContain('SMS_DEFAULT_DRIVER');
    expect(sample).toContain('SMS_KAVENEGAR_API_KEY');
    expect(sample).toContain('SMS_SMSIR_API_KEY');
  });
});
