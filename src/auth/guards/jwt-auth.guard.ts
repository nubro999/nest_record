import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Override this method to bypass JWT auth during development if needed
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // For development only - set to true to bypass JWT auth validation
    const BYPASS_JWT_AUTH = false;
    
    if (BYPASS_JWT_AUTH) {
      console.log('⚠️ WARNING: JWT authentication is bypassed for development');
      return true;
    }
    
    // Default to normal JWT validation
    return super.canActivate(context);
  }
}