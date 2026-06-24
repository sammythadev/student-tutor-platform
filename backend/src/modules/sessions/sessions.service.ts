import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SessionsRepository } from './sessions.repository';
import type { BookSessionDto, UpdateSessionStatusDto } from './dtos/session.dto';
import { SessionStatus } from './dtos/session.dto';
import type { SessionWithParticipants } from './sessions.types';

@Injectable()
export class SessionsService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  /**
   * Book a session. Students set tutorId, tutors must supply studentId.
   * All sessions start as 'pending' until the counterparty accepts.
   */
  async bookSession(
    initiatorId: string,
    initiatorRole: string,
    dto: BookSessionDto,
  ): Promise<SessionWithParticipants> {
    if (new Date(dto.startAt) >= new Date(dto.endAt)) {
      throw new BadRequestException('endAt must be after startAt');
    }

    // Resolve who is the student
    let resolvedStudentId: string;
    if (initiatorRole === 'student') {
      resolvedStudentId = initiatorId;
    } else if (initiatorRole === 'tutor') {
      if (!dto.studentId) {
        throw new BadRequestException('Tutors must supply studentId when booking a session');
      }
      resolvedStudentId = dto.studentId;
    } else {
      throw new ForbiddenException('Only students and tutors can book sessions');
    }

    return this.sessionsRepository.create(initiatorId, { ...dto, resolvedStudentId });
  }

  async getMySessions(userId: string): Promise<SessionWithParticipants[]> {
    return this.sessionsRepository.findForUser(userId);
  }

  async respondToSession(
    id: string,
    userId: string,
    accept: boolean,
  ): Promise<SessionWithParticipants> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) throw new NotFoundException('Session not found');

    if (session.status !== 'pending') {
      throw new BadRequestException('Only pending sessions can be accepted or declined');
    }

    // The responder must NOT be the initiator
    if (session.initiatorId === userId) {
      throw new ForbiddenException('You cannot respond to your own booking request');
    }

    // Must be a participant
    if (session.studentId !== userId && session.tutorId !== userId) {
      throw new ForbiddenException('You are not a participant of this session');
    }

    const newStatus = accept ? SessionStatus.UPCOMING : SessionStatus.CANCELLED;
    return this.sessionsRepository.updateStatus(id, userId, { status: newStatus });
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
