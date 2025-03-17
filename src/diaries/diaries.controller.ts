// diaries/diaries.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { DiariesService } from './diaries.service';
import { CreateDiaryDto } from './dto/create-diary.dto';
import { UpdateDiaryDto } from './dto/update-diary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('diaries')
@UseGuards(JwtAuthGuard)
export class DiariesController {
  constructor(private readonly diariesService: DiariesService) {}

  @Post()
  create(@Request() req, @Body() createDiaryDto: CreateDiaryDto) {
    return this.diariesService.create(req.user.id, createDiaryDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.diariesService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.diariesService.findOne(+id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateDiaryDto: UpdateDiaryDto) {
    return this.diariesService.update(+id, req.user.id, updateDiaryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.diariesService.remove(+id, req.user.id);
  }

  @Get(':id/analysis')
  getAnalysis(@Param('id') id: string, @Request() req) {
    return this.diariesService.getAiAnalysis(+id, req.user.id);
  }
}
