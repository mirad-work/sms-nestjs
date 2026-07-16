/**
 * Dependency-injection tests for SmsModule.
 *
 * These resolve SmsService through the Nest injector rather than calling
 * SmsService.create(), so they cover the module wiring itself: the config
 * token, what each registration exports, and forFeature().
 */

import { Module, Injectable, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  SmsModule,
  SmsService,
  SMS_CONFIG,
  DriverType,
  ISmsConfig,
  SmsOptionsFactory,
} from '../src';

const mockConfig: ISmsConfig = {
  defaultDriver: DriverType.MOCK,
  timeout: 5000,
  drivers: { mock: { shouldFail: false, delay: 0 } },
};

@Module({ imports: [SmsModule.forFeature()] })
class FeatureModule {}

describe('SmsModule dependency injection', () => {
  describe('forRoot', () => {
    it('resolves SmsService through the injector', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [SmsModule.forRoot({ config: mockConfig })],
      }).compile();

      const service = moduleRef.get(SmsService);

      expect(service).toBeInstanceOf(SmsService);
      expect(service.getDefaultDriver()).toBe(DriverType.MOCK);
    });

    it('sends a message through the injected service', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [SmsModule.forRoot({ config: mockConfig })],
      }).compile();

      const response = await moduleRef.get(SmsService).verify({
        to: '+989123456789',
        template: 'verify',
        tokens: { code: '12345' },
      });

      expect(response.success).toBe(true);
    });

    it('exposes the config under the exported SMS_CONFIG token', async () => {
      @Injectable()
      class Consumer {
        constructor(@Inject(SMS_CONFIG) public readonly config: ISmsConfig) {}
      }

      @Module({ imports: [SmsModule.forFeature()], providers: [Consumer] })
      class ConsumerModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [
          SmsModule.forRoot({ config: mockConfig, isGlobal: true }),
          ConsumerModule,
        ],
      }).compile();

      expect(moduleRef.get(Consumer, { strict: false }).config).toBe(
        mockConfig
      );
    });
  });

  describe('forRootAsync', () => {
    it('resolves SmsService when configured with useFactory', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          SmsModule.forRootAsync({ useFactory: () => mockConfig }),
        ],
      }).compile();

      expect(moduleRef.get(SmsService).getDefaultDriver()).toBe(
        DriverType.MOCK
      );
    });

    it('resolves SmsService when configured with useClass', async () => {
      @Injectable()
      class ConfigFactory implements SmsOptionsFactory {
        createSmsOptions(): ISmsConfig {
          return mockConfig;
        }
      }

      const moduleRef = await Test.createTestingModule({
        imports: [SmsModule.forRootAsync({ useClass: ConfigFactory })],
      }).compile();

      expect(moduleRef.get(SmsService).getDefaultDriver()).toBe(
        DriverType.MOCK
      );
    });

    it('injects dependencies into the factory', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ ignoreEnvFile: true }),
          SmsModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
              expect(configService).toBeInstanceOf(ConfigService);
              return mockConfig;
            },
            inject: [ConfigService],
          }),
        ],
      }).compile();

      expect(moduleRef.get(SmsService)).toBeInstanceOf(SmsService);
    });
  });

  describe('forTesting', () => {
    it('resolves a mock-backed SmsService', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [SmsModule.forTesting({})],
      }).compile();

      expect(moduleRef.get(SmsService).getDefaultDriver()).toBe(
        DriverType.MOCK
      );
    });

    it('honours the shouldFail option through the injector', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [SmsModule.forTesting({ shouldFail: true })],
      }).compile();

      const response = await moduleRef.get(SmsService).verify({
        to: '+989123456789',
        template: 'verify',
        tokens: { code: '12345' },
      });

      expect(response.success).toBe(false);
    });
  });

  describe('forFeature', () => {
    it('resolves SmsService in a feature module when the root is global', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          SmsModule.forRoot({ config: mockConfig, isGlobal: true }),
          FeatureModule,
        ],
      }).compile();

      expect(moduleRef.get(SmsService, { strict: false })).toBeInstanceOf(
        SmsService
      );
    });

    it('resolves SmsService in a feature module under a global forRootAsync', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          SmsModule.forRootAsync({
            useFactory: () => mockConfig,
            isGlobal: true,
          }),
          FeatureModule,
        ],
      }).compile();

      expect(moduleRef.get(SmsService, { strict: false })).toBeInstanceOf(
        SmsService
      );
    });
  });

  describe('invalid configuration', () => {
    it('rejects async registration with no useFactory/useClass/useExisting', () => {
      expect(() => SmsModule.forRootAsync({})).toThrow(
        /Must provide useFactory, useClass, or useExisting/
      );
    });
  });
});
