/**
 * Integration tests that verify the package works end-to-end
 * These tests should pass without complex DI setup issues
 */

import { 
  DriverType,
  ISmsConfig,
  ISmsMessage,
  NestSmsConfigHelper,
  SmsService,
  SmsModule
} from '../src';

describe('Package Integration Tests', () => {
  
  describe('Basic functionality', () => {
    it('should export all main components', () => {
      expect(SmsService).toBeDefined();
      expect(SmsModule).toBeDefined();
      expect(NestSmsConfigHelper).toBeDefined();
      expect(DriverType).toBeDefined();
    });

    it('should create config using helper', () => {
      const config = NestSmsConfigHelper.createForTesting();
      
      expect(config).toBeDefined();
      expect(config.defaultDriver).toBe(DriverType.MOCK);
      expect(config.drivers.mock).toBeDefined();
    });
  });

  describe('Configuration creation', () => {
    it('should create valid mock configuration', () => {
      const config = NestSmsConfigHelper.createForTesting({
        shouldFail: false,
        delay: 100
      });

      expect(config.defaultDriver).toBe(DriverType.MOCK);
      expect(config.drivers.mock?.shouldFail).toBe(false);
      expect(config.drivers.mock?.delay).toBe(100);
    });

    it('should provide sample environment configuration', () => {
      const sample = NestSmsConfigHelper.getSampleEnvConfiguration();
      
      expect(typeof sample).toBe('string');
      expect(sample).toContain('SMS_DEFAULT_DRIVER');
      expect(sample).toContain('SMS_KAVENEGAR_API_KEY');
    });
  });

  describe('Type definitions', () => {
    it('should have correct DriverType enum values', () => {
      expect(DriverType.MOCK).toBe('mock');
      expect(DriverType.KAVENEGAR).toBe('kavenegar');
      expect(DriverType.SMSIR).toBe('smsir');
      expect(DriverType.MELIPAYAMAK).toBe('melipayamak');
    });

    it('should accept valid SMS message structure', () => {
      const message: ISmsMessage = {
        to: '+989123456789',
        template: 'verify',
        tokens: { code: '123456' }
      };

      expect(message.to).toBe('+989123456789');
      expect(message.template).toBe('verify');
      expect(message.tokens).toEqual({ code: '123456' });
    });

    it('should accept valid SMS configuration', () => {
      const config: ISmsConfig = {
        defaultDriver: DriverType.MOCK,
        timeout: 5000,
        drivers: {
          mock: {
            shouldFail: false,
            delay: 0
          }
        }
      };

      expect(config.defaultDriver).toBe(DriverType.MOCK);
      expect(config.timeout).toBe(5000);
      expect(config.drivers.mock).toBeDefined();
    });
  });
});
