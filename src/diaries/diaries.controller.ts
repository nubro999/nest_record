// diaries/diaries.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Request } from '@nestjs/common';
import { DiariesService } from './diaries.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';

@Controller('diaries')
export class DiariesController {
  constructor(private readonly diariesService: DiariesService) {}

  @Post()
  async create(@Request() req, @Body() createDiaryDto: CreateDiaryDto) {
    const userId = req.user?.id || 1; // 테스트용 기본 사용자 ID
    return this.diariesService.create(userId, createDiaryDto);
  }

  @Get()
  async findAll(@Request() req) {
    const userId = req.user?.id || 1; // 테스트용 기본 사용자 ID
    return this.diariesService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || 1; // 테스트용 기본 사용자 ID
    return this.diariesService.findOne(+id, userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDiaryDto: UpdateDiaryDto, @Request() req) {
    const userId = req.user?.id || 1; // 테스트용 기본 사용자 ID
    return this.diariesService.update(+id, userId, updateDiaryDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || 1; // 테스트용 기본 사용자 ID
    return this.diariesService.remove(+id, userId);
  }

  @Get(':id/analysis')
  async getAiAnalysis(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || 1; // 테스트용 기본 사용자 ID
    return this.diariesService.getAiAnalysis(+id, userId);
  }
}
