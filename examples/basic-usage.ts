/**
 * Basic usage example for @mirad-work/sms-nestjs
 * 
 * This example demonstrates the simplest way to integrate SMS functionality
 * into your NestJS application using environment variables for configuration.
 */

import { Module, Controller, Post, Body, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { 
  SmsModule, 
  SmsService, 
  ISmsMessage, 
  ISmsResponse,
  DriverType 
} from '@mirad-work/sms-nestjs';

// DTO for the verification request
class SendVerificationDto {
  phoneNumber: string;
  code: string;
}

/**
 * Controller demonstrating basic SMS operations
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly smsService: SmsService) {}

  /**
   * Send OTP verification SMS
   */
  @Post('send-otp')
  async sendOTP(@Body() body: SendVerificationDto): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Create verification message
      const message: ISmsMessage = this.smsService.createVerificationMessage(
        body.phoneNumber,
        'verify', // Template name - should match your provider's template
        { code: body.code } // Template variables
      );

      // Send the SMS
      const response: ISmsResponse = await this.smsService.verify(message);

      if (response.success) {
        this.logger.log(`OTP sent successfully to ${body.phoneNumber}`);
        return {
          success: true,
          messageId: response.messageId,
        };
      } else {
        this.logger.warn(`Failed to send OTP to ${body.phoneNumber}: ${response.error}`);
        return {
          success: false,
          error: response.error,
        };
      }
    } catch (error) {
      this.logger.error(`Error sending OTP to ${body.phoneNumber}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get SMS service health status
   */
  @Post('sms-health')
  async getSmsHealth() {
    return this.smsService.healthCheck();
  }
}

/**
 * Main application module with basic SMS configuration
 * 
 * This module demonstrates the simplest setup using environment variables.
 * Make sure to set these environment variables:
 * 
 * SMS_DEFAULT_DRIVER=kavenegar
 * SMS_KAVENEGAR_API_KEY=your-api-key
 * SMS_KAVENEGAR_LINE_NUMBER=your-line-number
 * 
 * Or for SMS.ir:
 * SMS_DEFAULT_DRIVER=smsir
 * SMS_SMSIR_API_KEY=your-api-key
 * SMS_SMSIR_LINE_NUMBER=your-line-number
 */
@Module({
  imports: [
    // Configure environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Configure SMS module using environment variables
    SmsModule.forEnvironment({
      isGlobal: true, // Make SMS service available globally
    }),
  ],
  controllers: [AuthController],
})
export class AppModule {}

/**
 * Bootstrap function to start the application
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get SMS service to validate configuration on startup
  const smsService = app.get(SmsService);
  const serviceInfo = smsService.getServiceInfo();
  
  console.log('🚀 SMS Service Configuration:');
  console.log(`📱 Default Driver: ${serviceInfo.defaultDriver}`);
  console.log(`🔧 Available Drivers: ${serviceInfo.availableDrivers.join(', ')}`);
  console.log(`⏱️  Timeout: ${serviceInfo.timeout}ms`);
  console.log(`📋 Configured Drivers: ${serviceInfo.driversConfigured.join(', ')}`);
  
  await app.listen(3000);
  console.log('🚀 Application is running on: http://localhost:3000');
  console.log('📋 Try: POST http://localhost:3000/auth/send-otp');
  console.log('📋 Try: POST http://localhost:3000/auth/sms-health');
}

// Example of manual testing with the service
async function testSmsService() {
  // This is for demonstration - normally you'd test via HTTP endpoints
  const app = await NestFactory.create(AppModule);
  const smsService = app.get(SmsService);
  
  try {
    console.log('Testing SMS service...');
    
    const response = await smsService.verify({
      to: '+989123456789', // Replace with actual phone number
      template: 'verify',
      tokens: { code: '123456' },
    });
    
    console.log('SMS Response:', response);
  } catch (error) {
    console.error('SMS Test Error:', error);
  }
  
  await app.close();
}

// Uncomment to run the bootstrap function
// bootstrap();

// Uncomment to run the test function
// testSmsService();

export { bootstrap, testSmsService };
