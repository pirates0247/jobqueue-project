import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { ClaimJobsDto } from './dto/claim-jobs.dto';
import { CompleteJobDto } from './dto/complete-job.dto';
import { FailJobDto } from './dto/fail-job.dto';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterWorkerDto) {
    return this.workersService.register(dto);
  }

  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Param('id') id: string) {
    return this.workersService.heartbeat(id);
  }

  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  async claimJobs(@Param('id') id: string, @Body() dto: ClaimJobsDto) {
    return this.workersService.claimJobs(id, dto);
  }

  @Post(':id/jobs/:jobId/complete')
  @HttpCode(HttpStatus.OK)
  async completeJob(
    @Param('id') id: string,
    @Param('jobId') jobId: string,
    @Body() dto: CompleteJobDto,
  ) {
    return this.workersService.completeJob(id, jobId, dto);
  }

  @Post(':id/jobs/:jobId/fail')
  @HttpCode(HttpStatus.OK)
  async failJob(@Param('id') id: string, @Param('jobId') jobId: string, @Body() dto: FailJobDto) {
    return this.workersService.failJob(id, jobId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.workersService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.workersService.findById(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.workersService.remove(id);
  }
}
