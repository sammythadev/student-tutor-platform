import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SessionsRepository } from './sessions.repository';
import type {
  BookSessionDto,
  BookSessionSeriesDto,
  ProposeSessionDto,
  UpdateSessionStatusDto,
} from './dtos/session.dto';
import { SessionRecurrence, SessionStatus } from './dtos/session.dto';
import type { SessionSeriesWithSessions, SessionWithParticipants } from './sessions.types';
import { NotificationsService } from '@modules/notifications/notifications.service';

/** `2026-07-10T09:00:00.000Z` → `2026-07-10 09:00 UTC`, for a message a human reads. */
const readableStart = (startAt: Date): string =>
  `${startAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

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

    await this.requireTutorSubject(dto.tutorId, dto.subject);

    // Check for overlapping sessions at the requested time
    const overlapCount = await this.sessionsRepository.findOverlappingSessionCount(
      dto.tutorId,
      startAt,
      endAt,
    );
    if (overlapCount > 0) {
      throw new BadRequestException('The tutor already has a session scheduled during this time');
    }

    const resolvedStudentId = this.resolveStudentId(initiatorId, initiatorRole, dto.studentId);

    const session = await this.sessionsRepository.create(initiatorId, {
      ...dto,
      resolvedStudentId,
    });

    // Notify the non-initiator of the new session request
    this.notificationsService
      .onSessionEvent(
        'created',
        session.id,
        session.tutorName ?? 'Tutor',
        session.studentName ?? 'Student',
        session.subject,
        session.tutorId,
        session.studentId,
        initiatorId,
      )
      .catch(() => {
        /* non-blocking */
      });

    return session;
  }

  /** The subject must be one the tutor actually teaches, or the request is a dead end. */
  private async requireTutorSubject(tutorId: string, subject: string): Promise<void> {
    const tutorSubjects = await this.sessionsRepository.findTutorSubjects(tutorId);
    if (!tutorSubjects.map((s) => s.toLowerCase()).includes(subject.toLowerCase())) {
      throw new BadRequestException(
        `Tutor does not teach "${subject}". Available subjects: ${tutorSubjects.join(', ')}`,
      );
    }
  }

  /** A student books for themselves; a tutor must name the student they are teaching. */
  private resolveStudentId(initiatorId: string, initiatorRole: string, requested?: string): string {
    if (initiatorRole === 'student') return initiatorId;
    if (initiatorRole === 'tutor') {
      if (!requested) {
        throw new BadRequestException('Tutors must supply studentId when booking a session');
      }
      return requested;
    }
    throw new ForbiddenException('Only students and tutors can book sessions');
  }

  /**
   * Requests a recurring block — "every day for two weeks", "Mon/Wed/Fri for a term".
   *
   * Each occurrence is stored as an ordinary pending session sharing a series row, so
   * every existing flow (accept, propose another time, decline, complete, cancel) keeps
   * working on a single day, and the tutor can still decline one morning without
   * throwing away the whole block. The client generates the occurrence list from its own
   * calendar — which is the only place that knows the local timezone — and the server
   * validates the schedule, the horizon and every window before writing anything.
   */
  async bookSeries(
    initiatorId: string,
    initiatorRole: string,
    dto: BookSessionSeriesDto,
  ): Promise<SessionSeriesWithSessions> {
    const occurrences = dto.occurrences
      .map(({ startAt, endAt }) => ({ startAt: new Date(startAt), endAt: new Date(endAt) }))
      .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());

    const now = new Date();
    for (const occurrence of occurrences) {
      if (occurrence.startAt >= occurrence.endAt)
        throw new BadRequestException('Every session must end after it starts');
      if (occurrence.startAt <= now)
        throw new BadRequestException('Every session in the series must start in the future');
    }

    if (
      new Set(occurrences.map((occurrence) => occurrence.startAt.getTime())).size !==
      occurrences.length
    )
      throw new BadRequestException('The same start time was requested twice in this series');

    // Sorted above, so neighbours are the only pairs that can overlap.
    for (let index = 1; index < occurrences.length; index += 1) {
      if (occurrences[index].startAt < occurrences[index - 1].endAt)
        throw new BadRequestException('Two sessions in this series overlap each other');
    }

    const weekdays = [...new Set(dto.weekdays ?? [])].sort((left, right) => left - right);
    if (dto.recurrence !== SessionRecurrence.DAILY && weekdays.length === 0)
      throw new BadRequestException('Choose at least one weekday for this series');
    if (occurrences.length > dto.weeks * 7)
      throw new BadRequestException(
        `A ${dto.weeks}-week series cannot hold ${occurrences.length} sessions`,
      );

    await this.requireTutorSubject(dto.tutorId, dto.subject);
    const resolvedStudentId = this.resolveStudentId(initiatorId, initiatorRole, dto.studentId);

    // One read covers the whole block; the first clash is named so the request can be
    // corrected rather than silently creating a double-booked term.
    const existing = await this.sessionsRepository.findOverlappingSessions(
      dto.tutorId,
      occurrences[0].startAt,
      occurrences[occurrences.length - 1].endAt,
    );
    const clash = occurrences.find((occurrence) =>
      existing.some(
        (session) => session.endAt > occurrence.startAt && session.startAt < occurrence.endAt,
      ),
    );
    if (clash)
      throw new BadRequestException(
        `The tutor already has a session at ${readableStart(clash.startAt)}`,
      );

    const created = await this.sessionsRepository.createSeries(
      initiatorId,
      {
        tutorId: dto.tutorId,
        studentId: resolvedStudentId,
        subject: dto.subject,
        recurrence: dto.recurrence,
        weekdays: dto.recurrence === SessionRecurrence.DAILY ? [] : weekdays,
        timeOfDay: dto.timeOfDay,
        durationMinutes: dto.durationMinutes,
        startsOn: dto.startsOn,
        endsOn: dto.endsOn,
        weeks: dto.weeks,
        notes: dto.notes ?? null,
        meetingUrl: dto.meetingUrl ?? null,
      },
      occurrences,
    );

    // One notification for the ask, not one per day: the series is a single request.
    this.notifySession('created', created.sessions[0], initiatorId);
    return created;
  }

  /**
   * Answers the whole block at once. The rules mirror a single session exactly — the
   * responder must be a participant and must not be the one who asked — because a
   * recurring request is the same agreement, just repeated.
   */
  async respondToSeries(
    id: string,
    userId: string,
    accept: boolean,
  ): Promise<SessionSeriesWithSessions> {
    const series = await this.requireSeries(id, userId);
    if (series.createdById === userId) {
      throw new ForbiddenException('You cannot respond to your own booking request');
    }

    const answered = await this.sessionsRepository.updateSeriesPendingStatus(
      id,
      accept ? 'upcoming' : 'cancelled',
    );
    if (answered === 0) {
      throw new BadRequestException('This series has no pending sessions left to answer');
    }

    const sessions = await this.sessionsRepository.findSeriesSessions(id);
    this.notifySession(accept ? 'accepted' : 'declined', sessions[0], userId);
    return { series, sessions };
  }

  /** Stops whatever is left of a block. Completed sessions are history and stay. */
  async cancelSeries(id: string, userId: string): Promise<SessionSeriesWithSessions> {
    const series = await this.requireSeries(id, userId);
    const cancelled = await this.sessionsRepository.cancelSeriesSessions(id);
    if (cancelled === 0) {
      throw new BadRequestException('This series has no sessions left to cancel');
    }

    const sessions = await this.sessionsRepository.findSeriesSessions(id);
    this.notifySession('cancelled', sessions[0], userId);
    return { series, sessions };
  }

  async getSeries(id: string, userId: string): Promise<SessionSeriesWithSessions> {
    return {
      series: await this.requireSeries(id, userId),
      sessions: await this.sessionsRepository.findSeriesSessions(id),
    };
  }

  /**
   * Resolves a series for a participant only, answering `404` for everyone else so the
   * API never confirms that someone else's block exists.
   */
  private async requireSeries(id: string, userId: string) {
    const series = await this.sessionsRepository.findSeriesById(id);
    if (!series || (series.tutorId !== userId && series.studentId !== userId)) {
      throw new NotFoundException('Session series not found');
    }
    return series;
  }

  private notifySession(
    event: 'created' | 'accepted' | 'declined' | 'cancelled',
    session: SessionWithParticipants | undefined,
    initiatorId: string,
  ): void {
    if (!session) return;
    this.notificationsService
      .onSessionEvent(
        event,
        session.id,
        session.tutorName ?? 'Tutor',
        session.studentName ?? 'Student',
        session.subject,
        session.tutorId,
        session.studentId,
        initiatorId,
      )
      .catch(() => {
        /* non-blocking */
      });
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
    const updated = await this.sessionsRepository.updateStatus(id, userId, { status: newStatus });

    // Emit notification for accept/decline
    const event = accept ? 'accepted' : 'declined';
    this.notificationsService
      .onSessionEvent(
        event,
        session.id,
        session.tutorName ?? 'Tutor',
        session.studentName ?? 'Student',
        session.subject,
        session.tutorId,
        session.studentId,
        session.initiatorId ?? '',
      )
      .catch(() => {
        /* non-blocking */
      });

    return updated;
  }

  async proposeNewTime(
    id: string,
    userId: string,
    dto: ProposeSessionDto,
  ): Promise<SessionWithParticipants> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) throw new NotFoundException('Session not found');

    if (session.status !== 'pending') {
      throw new BadRequestException('Only pending sessions can be rescheduled');
    }

    if (session.initiatorId === userId) {
      throw new ForbiddenException('Only the counterparty can propose a new time');
    }

    if (session.studentId !== userId && session.tutorId !== userId) {
      throw new ForbiddenException('You are not a participant of this session');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    if (startAt <= new Date()) {
      throw new BadRequestException('Proposed time must be in the future');
    }

    const updated = await this.sessionsRepository.updateProposedTime(id, dto);

    this.notificationsService
      .onSessionEvent(
        'proposed',
        session.id,
        session.tutorName ?? 'Tutor',
        session.studentName ?? 'Student',
        session.subject,
        session.tutorId,
        session.studentId,
        session.initiatorId ?? '',
      )
      .catch(() => {});

    return updated;
  }

  async acceptProposal(id: string, userId: string): Promise<SessionWithParticipants> {
    const session = await this.sessionsRepository.findById(id);
    if (!session) throw new NotFoundException('Session not found');

    if (!session.proposedStartAt || !session.proposedEndAt) {
      throw new BadRequestException('No proposal to accept');
    }

    // Only the initiator (student) can accept the proposal
    if (session.initiatorId !== userId) {
      throw new ForbiddenException('Only the session initiator can accept the proposal');
    }

    return this.sessionsRepository.acceptProposedTime(id);
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
    if (!newTutorSubjects.map((s) => s.toLowerCase()).includes(session.subject.toLowerCase())) {
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
      throw new BadRequestException(
        'The new tutor already has a session scheduled during this time',
      );
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
    const updated = await this.sessionsRepository.updateStatus(id, userId, dto);

    // Emit notification for completed/cancelled
    if (dto.status === SessionStatus.COMPLETED || dto.status === SessionStatus.CANCELLED) {
      this.notificationsService
        .onSessionEvent(
          dto.status,
          session.id,
          session.tutorName ?? 'Tutor',
          session.studentName ?? 'Student',
          session.subject,
          session.tutorId,
          session.studentId,
          session.initiatorId ?? '',
        )
        .catch(() => {
          /* non-blocking */
        });
    }

    return updated;
  }
}
