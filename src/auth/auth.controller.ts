import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginData: { username: string; password: string }) {
    try {
      console.log(`Login attempt: ${loginData.username}`);
      const user = await this.authService.validateUser(
        loginData.username,
        loginData.password,
      );
      
      if (!user) {
        console.log(`Login failed for user: ${loginData.username} - Invalid credentials`);
        return { success: false, message: 'Invalid credentials' };
      }
      
      console.log(`Login successful for user: ${loginData.username}`);
      const result = await this.authService.login(user);
      console.log(`Generated token: ${result.access_token.substring(0, 20)}...`);
      return result;
    } catch (error) {
      console.error(`Login error for ${loginData.username}:`, error);
      return { success: false, message: 'Authentication failed', error: error.message };
    }
  }

  @Post('register')
  async register(
    @Body() registerData: { username: string; email: string; password: string },
  ) {
    try {
      console.log(`Registration attempt: ${registerData.username}`);
      const result = await this.authService.register(
        registerData.username,
        registerData.email,
        registerData.password,
      );
      console.log(`Registration successful for: ${registerData.username}`);
      return result;
    } catch (error) {
      console.error(`Registration failed for ${registerData.username}:`, error);
      return { 
        success: false, 
        message: error.message || 'Registration failed',
        error: error.message
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    console.log(`Profile accessed by user ID: ${req.user.id}`);
    return { user: req.user };
  }
}
