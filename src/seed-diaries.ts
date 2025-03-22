// src/seed-diaries.ts - Run this with 'npx ts-node src/seed-diaries.ts' to create sample diaries
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Diary } from './diaries/entities/diary.entity';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get the repositories directly
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const diaryRepository = app.get<Repository<Diary>>(getRepositoryToken(Diary));

  try {
    // Find testuser
    console.log('Looking for test user...');
    const testUser = await userRepository.findOne({ 
      where: { username: 'testuser' } 
    });
    
    if (!testUser) {
      console.error('Test user not found. Please run seed-user.ts first.');
      return;
    }
    
    console.log(`Found test user with ID: ${testUser.id}`);
    
    // Create sample diary entries
    const diaries = [
      {
        title: 'My First Diary Entry',
        content: 'This is a sample diary entry created for testing purposes.',
        date: new Date(),
        structuredContent: {
          morning: 'I woke up early and had breakfast.',
          afternoon: 'I worked on some programming tasks.',
          evening: 'I relaxed and watched a movie.'
        },
        isAnalyzed: true,
        isComplete: true,
        analysis: {
          feelings: {
            emotion: 'positive',
            reason: 'Had a productive day'
          },
          keywords: ['productive', 'programming', 'relaxation'],
          summary: {
            morning: 'Started the day with energy',
            afternoon: 'Focused on work',
            evening: 'Enjoyed leisure time'
          },
          question: 'What project would you like to work on next?'
        }
      },
      {
        title: 'Weekend Activity',
        content: 'Spent the weekend outdoors exploring nature.',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        structuredContent: {
          morning: 'Prepared for a hike',
          afternoon: 'Discovered a beautiful trail',
          evening: 'Made dinner at the campsite'
        },
        isAnalyzed: true,
        isComplete: true,
        analysis: {
          feelings: {
            emotion: 'excited',
            reason: 'Enjoyed nature and outdoor activities'
          },
          keywords: ['nature', 'hiking', 'outdoors'],
          summary: {
            morning: 'Started the day with preparation',
            afternoon: 'Explored nature',
            evening: 'Enjoyed outdoor cooking'
          },
          question: 'Where would you like to hike next time?'
        }
      }
    ];
    
    console.log('Creating sample diary entries...');
    
    // Clear existing diaries (optional)
    const existingDiaries = await diaryRepository.find({
      where: { user: { id: testUser.id } }
    });
    
    if (existingDiaries.length > 0) {
      console.log(`Found ${existingDiaries.length} existing diaries. Removing...`);
      await diaryRepository.remove(existingDiaries);
    }
    
    // Create new diaries
    for (const diaryData of diaries) {
      const diary = diaryRepository.create({
        ...diaryData,
        user: testUser
      });
      
      const savedDiary = await diaryRepository.save(diary);
      console.log(`Created diary with ID: ${savedDiary.id}`);
    }

    console.log('Sample diaries created successfully');
  } catch (error) {
    console.error('Error creating sample diaries:', error);
  } finally {
    await app.close();
  }
}

bootstrap();