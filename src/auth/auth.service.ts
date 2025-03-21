import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    console.log(`Attempting to validate user: ${username}`);
    const user = await this.usersService.findOneByUsername(username);
    
    if (!user) {
      console.log(`User not found: ${username}`);
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`Invalid password for user: ${username}`);
      return null;
    }
    
    console.log(`User validated successfully: ${username}`);
    const { password: _, ...result } = user;
    return result;
  }
  
  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    console.log(`Generating JWT token for user: ${user.username}`);
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };
  }
  
  async register(username: string, email: string, password: string) {
    console.log(`Registering new user: ${username}, ${email}`);
    // First check if user already exists
    const existingUser = await this.usersService.findOneByUsername(username);
    if (existingUser) {
      throw new UnauthorizedException('Username already exists');
    }
    
    const existingEmail = await this.usersService.findOneByEmail(email);
    if (existingEmail) {
      throw new UnauthorizedException('Email already in use');
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user
    const newUser = await this.usersService.create({
      username,
      email,
      password: hashedPassword,
    });
    
    // Generate and return token
    const payload = { username: newUser.username, sub: newUser.id };
    console.log(`User registered successfully: ${username}`);
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    };
  }
}
