import { DriverType, ISmsConfig, SmsService } from '../src';

const liveEnabled = process.env.SMS_LIVE_TEST === 'true';
const liveKavenegarAndMelipayamak =
  liveEnabled &&
  process.env.SMS_LIVE_PHONE &&
  process.env.SMS_KAVENEGAR_API_KEY &&
  process.env.SMS_MELIPAYAMAK_USERNAME &&
  process.env.SMS_MELIPAYAMAK_PASSWORD
    ? it
    : it.skip;
const phone = process.env.SMS_LIVE_PHONE;
const token = process.env.SMS_LIVE_TOKEN || '12345';

describe('opt-in live provider contract', () => {
  liveKavenegarAndMelipayamak(
    'submits Kavenegar and Melipayamak through the same NestJS contract',
    async () => {
      if (
        !phone ||
        !process.env.SMS_KAVENEGAR_API_KEY ||
        !process.env.SMS_MELIPAYAMAK_USERNAME ||
        !process.env.SMS_MELIPAYAMAK_PASSWORD
      ) {
        throw new Error('Live Kavenegar/Melipayamak environment is incomplete');
      }

      const config: ISmsConfig = {
        defaultDriver: DriverType.KAVENEGAR,
        drivers: {
          kavenegar: {
            url:
              process.env.SMS_KAVENEGAR_URL || 'https://api.kavenegar.com/v1/',
            apiKey: process.env.SMS_KAVENEGAR_API_KEY,
          },
          melipayamak: {
            url:
              process.env.SMS_MELIPAYAMAK_URL ||
              'https://rest.payamak-panel.com/api/SendSMS/',
            username: process.env.SMS_MELIPAYAMAK_USERNAME,
            password: process.env.SMS_MELIPAYAMAK_PASSWORD,
          },
        },
      };
      const sms = SmsService.create(config);

      const kavenegar = await sms.verify({
        to: phone,
        driver: DriverType.KAVENEGAR,
        template: process.env.SMS_KAVENEGAR_TEMPLATE || 'otp-payehsho',
        tokens: { token },
      });
      const melipayamak = await sms.verify({
        to: phone,
        driver: DriverType.MELIPAYAMAK,
        template: process.env.SMS_MELIPAYAMAK_TEMPLATE || '496378',
        tokens: { one: token },
      });

      expect(kavenegar).toMatchObject({
        success: true,
        driver: DriverType.KAVENEGAR,
        submissionStatus: 'accepted',
      });
      expect(melipayamak).toMatchObject({
        success: true,
        driver: DriverType.MELIPAYAMAK,
        submissionStatus: 'accepted',
      });
    },
    30_000
  );

  const liveSmsIr =
    liveEnabled &&
    phone &&
    process.env.SMS_SMSIR_API_KEY &&
    process.env.SMS_SMSIR_TEMPLATE
      ? it
      : it.skip;
  liveSmsIr(
    'submits SMS.ir through the same NestJS contract',
    async () => {
      const sms = SmsService.create({
        defaultDriver: DriverType.SMSIR,
        drivers: {
          smsir: {
            url: process.env.SMS_SMSIR_URL || 'https://api.sms.ir/v1/',
            apiKey: process.env.SMS_SMSIR_API_KEY!,
          },
        },
      });

      await expect(
        sms.verify({
          to: phone!,
          template: process.env.SMS_SMSIR_TEMPLATE!,
          tokens: { token },
        })
      ).resolves.toMatchObject({
        success: true,
        driver: DriverType.SMSIR,
        submissionStatus: 'accepted',
      });
    },
    30_000
  );

  const liveIppanel =
    liveEnabled &&
    phone &&
    process.env.SMS_IPPANEL_API_KEY &&
    process.env.SMS_IPPANEL_LINE_NUMBER &&
    process.env.SMS_IPPANEL_TEMPLATE
      ? it
      : it.skip;
  liveIppanel(
    'submits IPPanel through the same NestJS contract',
    async () => {
      const sms = SmsService.create({
        defaultDriver: DriverType.IPPANEL,
        drivers: {
          ippanel: {
            url: process.env.SMS_IPPANEL_URL || 'https://api2.ippanel.com/',
            apiKey: process.env.SMS_IPPANEL_API_KEY!,
            lineNumber: process.env.SMS_IPPANEL_LINE_NUMBER!,
          },
        },
      });

      await expect(
        sms.verify({
          to: phone!,
          template: process.env.SMS_IPPANEL_TEMPLATE!,
          tokens: { token },
        })
      ).resolves.toMatchObject({
        success: true,
        driver: DriverType.IPPANEL,
        submissionStatus: 'accepted',
      });
    },
    30_000
  );
});
