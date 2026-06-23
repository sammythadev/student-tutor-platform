import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SessionsRepository } from './sessions.repository';
import type { BookSessionDto, UpdateSessionStatusDto } from './dtos/session.dto';
import type { SessionWithParticipants } from './sessions.types';

@Injectable()
export class SessionsService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  async bookSession(studentId: string, dto: BookSessionDto): Promise<SessionWithParticipants> {
    if (new Date(dto.startAt) >= new Date(dto.endAt)) {
      throw new BadRequestException('endAt must be after startAt');
    }
    return this.sessionsRepository.create(studentId, dto);
  }

  async getMySessions(userId: string): Promise<SessionWithParticipants[]> {
    return this.sessionsRepository.findForUser(userId);
  }

  async updateStatus(
    id: string,
    userId: string,
    dto: UpdateSessionStatusDto,
  ): Promise<SessionWithParticipants> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) throw new NotFoundException('Session not found');
    return this.sessionsRepository.updateStatus(id, userId, dto);
  }
}
