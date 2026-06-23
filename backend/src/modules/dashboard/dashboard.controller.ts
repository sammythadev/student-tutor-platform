import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, Roles, RolesGuard, type AuthenticatedUser } from '@common/auth';
import { DashboardMetricsDto, TutorDashboardMetricsDto } from './dtos/dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @Roles('student')
  @ApiOperation({ summary: 'Get student dashboard KPIs, weekly hours, and upcoming sessions' })
  @ApiResponse({ status: 200, type: DashboardMetricsDto })
  getStudentMetrics(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<DashboardMetricsDto> {
    return this.dashboardService.getStudentMetrics(currentUser.id);
  }

  @Get('tutor-metrics')
  @Roles('tutor')
  @ApiOperation({ summary: 'Get tutor dashboard KPIs, weekly sessions, and student count' })
  @ApiResponse({ status: 200, type: TutorDashboardMetricsDto })
  getTutorMetrics(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<TutorDashboardMetricsDto> {
    return this.dashboardService.getTutorMetrics(currentUser.id);
  }

  @Get('admin-metrics')
  @Roles('admin')
  @ApiOperation({ summary: 'Get admin platform overview metrics' })
  @ApiResponse({ status: 200 })
  getAdminMetrics() {
    return this.dashboardService.getAdminMetrics();
  }
}
