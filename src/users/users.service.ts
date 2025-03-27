// users/users.service.ts
import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}
  
  // Create a test user when the application starts
  async onModuleInit() {
    try {
      // Check if test user already exists
      const testUser = await this.findOneByUsername('testuser');
      
      if (!testUser) {
        console.log('Creating test user...');
        
        // Create a test user for development with properly hashed password
        // Password will be hashed by the create method
        await this.create({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
        console.log('Test user created successfully');
      } else {
        console.log('Test user already exists');
      }
    } catch (error) {
      console.error('Error creating test user:', error);
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({ 
      where: { username: createUserDto.username } 
    });
    
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const existingEmail = await this.usersRepository.findOne({
      where: { email: createUserDto.email }
    });

    if (existingEmail) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ 
      where: { id },
      relations: ['diaries'] 
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  async findOneByUsername(username: string): Promise<User | null> {
    console.log(`Looking up user by username: ${username}`);
    return this.usersRepository.findOne({ 
      where: { username } 
    });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    console.log(`Looking up user by email: ${email}`);
    return this.usersRepository.findOne({ 
      where: { email } 
    });
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({ 
      where: { username } 
    });
    
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }
    
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    const updatedUser = this.usersRepository.merge(user, updateUserDto);
    return this.usersRepository.save(updatedUser);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}