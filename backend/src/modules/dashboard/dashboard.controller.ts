import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  async getMetrics() {
    return this.dashboardService.getMetrics();
  }
}
