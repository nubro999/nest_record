// src/seed-user.ts - Run this with 'npx ts-node src/seed-user.ts' to create test user
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { User } from './users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const usersService = app.get(UsersService);
  
  // Get the repository directly
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

  try {
    // Check if test user exists using findOne instead
    console.log('Looking for test user...');
    const existingUser = await userRepository.findOne({ 
      where: { username: 'testuser' } 
    });
    
    if (existingUser) {
      console.log('Test user already exists with ID:', existingUser.id);
      
      // Update password for existing user
      const hashedPassword = await bcrypt.hash('password123', 10);
      console.log('Generated new password hash:', hashedPassword);
      
      // Update user directly with repository
      await userRepository.update(
        { id: existingUser.id },
        { password: hashedPassword }
      );
      console.log('Password updated for testuser');
      
    } else {
      // User doesn't exist, create a new one
      console.log('Creating new test user...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      console.log('Password hash for new user:', hashedPassword);
      
      // Create directly with repository
      const newUser = userRepository.create({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword // Use hashed password directly
      });
      
      const savedUser = await userRepository.save(newUser);
      console.log('Test user created with ID:', savedUser.id);
    }

    console.log('Test user setup completed successfully');
  } catch (error) {
    console.error('Error setting up test user:', error);
  } finally {
    await app.close();
  }
}

bootstrap();