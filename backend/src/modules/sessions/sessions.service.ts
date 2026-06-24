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
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    if (startAt <= new Date()) {
      throw new BadRequestException('Session start time must be in the future');
    }

    // Validate the requested subject is taught by the tutor
    const tutorSubjects = await this.sessionsRepository.findTutorSubjects(dto.tutorId);
    if (!tutorSubjects.includes(dto.subject)) {
      throw new BadRequestException(
        `Tutor does not teach "${dto.subject}". Available subjects: ${tutorSubjects.join(', ')}`,
      );
    }

    // Check for overlapping sessions at the requested time
    const overlapCount = await this.sessionsRepository.findOverlappingSessionCount(
      dto.tutorId,
      startAt,
      endAt,
    );
    if (overlapCount > 0) {
      throw new BadRequestException('The tutor already has a session scheduled during this time');
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

  async transferTutor(
    id: string,
    userId: string,
    newTutorId: string,
  ): Promise<SessionWithParticipants> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) throw new NotFoundException('Session not found');

    // Only the student or the current tutor can transfer
    if (session.studentId !== userId && session.tutorId !== userId) {
      throw new ForbiddenException('Only session participants can transfer the tutor');
    }

    if (session.status !== 'pending' && session.status !== 'upcoming') {
      throw new BadRequestException('Only pending or upcoming sessions can be transferred');
    }

    if (session.tutorId === newTutorId) {
      throw new BadRequestException('Session is already assigned to this tutor');
    }

    // Validate the new tutor teaches the session's subject
    const newTutorSubjects = await this.sessionsRepository.findTutorSubjects(newTutorId);
    if (!newTutorSubjects.includes(session.subject)) {
      throw new BadRequestException(
        `New tutor does not teach "${session.subject}". Available subjects: ${newTutorSubjects.join(', ')}`,
      );
    }

    // Check for overlapping sessions with the new tutor
    const overlapCount = await this.sessionsRepository.findOverlappingSessionCount(
      newTutorId,
      session.startAt,
      session.endAt,
    );
    if (overlapCount > 0) {
      throw new BadRequestException('The new tutor already has a session scheduled during this time');
    }

    return this.sessionsRepository.updateTutor(id, newTutorId);
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
