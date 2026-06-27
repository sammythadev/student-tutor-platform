import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard, CurrentUser, type AuthenticatedUser } from '@common/auth';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user (newest first)' })
  @ApiResponse({ status: 200, description: 'Notifications list.' })
  getMyNotifications(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.notificationsService.getForUser(currentUser.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications (for the red dot indicator)' })
  @ApiResponse({ status: 200, description: 'Unread notification count.' })
  async getUnreadCount(@CurrentUser() currentUser: AuthenticatedUser) {
    const count = await this.notificationsService.getUnreadCount(currentUser.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  async markRead(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.notificationsService.markRead(id, currentUser.id);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read.' })
  async markAllRead(@CurrentUser() currentUser: AuthenticatedUser) {
    await this.notificationsService.markAllRead(currentUser.id);
    return { success: true };
  }
}
