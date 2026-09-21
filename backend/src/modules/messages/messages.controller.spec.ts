import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { AuthGuard } from '@common/auth';
import * as schema from '@database/schema';
import { DATABASE, type AppDatabase } from '@database';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { MessagesRepository } from './messages.repository';

const senderId = '00000000-0000-4000-8000-000000000001';
const receiverId = '00000000-0000-4000-8000-000000000002';
const id = '00000000-0000-4000-8000-000000000003';
const originalId = '00000000-0000-4000-8000-000000000004';
const createdAt = '2026-09-17T12:00:00.000Z';

const plainRow = [
  originalId,
  receiverId,
  senderId,
  'Question',
  null,
  null,
  createdAt,
  'Sam B',
  false,
  null,
  null,
  null,
  null,
];
const replyRow = [
  '00000000-0000-4000-8000-000000000005',
  senderId,
  receiverId,
  'Answer',
  originalId,
  null,
  createdAt,
  'Ada A',
  true,
  originalId,
  'Question',
  receiverId,
  'Sam B',
];

// Real Nest pipeline with an HTTP integration surface over a mocked pg driver.
class StubAuthGuard {
  private static readonly user = { id: senderId, email: 'sender@example.test', role: 'student' };

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ authUser?: { id: string; email: string; role: string } }>();
    request.authUser = StubAuthGuard.user;
    return true;
  }
}

describe('Messages reply HTTP integration', () => {
  let app: INestApplication<App>;
  const query = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        MessagesService,
        MessagesRepository,
        {
          provide: DATABASE,
          useValue: drizzle({ query } as unknown as Pool, { schema }) as AppDatabase,
        },
        { provide: AuthGuard, useValue: StubAuthGuard },
      ],
    })
      .overrideGuard(AuthGuard)
      .useClass(StubAuthGuard)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => query.mockReset());

  it('POST /messages then GET /messages/:peer round-trips a populated reply preview', async () => {
    // The pg driver maps positional rows; an object row would map to undefined
    // fields and be treated as a foreign conversation (intentional 404 path).
    query.mockResolvedValueOnce({ rows: [[receiverId, senderId]] });
    query.mockResolvedValueOnce({ rows: [[id]] });
    query.mockResolvedValueOnce({ rows: [replyRow] });
    const sendResponse = await request(app.getHttpServer())
      .post('/messages')
      .send({ receiverId, content: 'Answer', replyToId: originalId })
      .expect(201);
    const sendBody = sendResponse.body as {
      replyToId: string | null;
      replyTo: { id: string; content: string; senderId: string; senderName?: string } | null;
    };
    expect(sendBody.replyToId).toBe(originalId);
    expect(sendBody.replyTo).toEqual({
      id: originalId,
      content: 'Question',
      senderId: receiverId,
      senderName: 'Sam B',
    });

    query.mockResolvedValueOnce({ rows: [plainRow, replyRow] });
    const threadResponse = await request(app.getHttpServer())
      .get(`/messages/${receiverId}`)
      .expect(200);
    const thread = threadResponse.body as Array<{
      replyToId: string | null;
      replyTo: { id: string; content: string; senderId: string; senderName?: string } | null;
    }>;
    expect(thread).toHaveLength(2);
    expect(thread[0].replyToId).toBeNull();
    expect(thread[0].replyTo).toBeNull();
    expect(thread[1].replyToId).toBe(originalId);
    expect(thread[1].replyTo).toEqual({
      id: originalId,
      content: 'Question',
      senderId: receiverId,
      senderName: 'Sam B',
    });
  });

  it('POST /messages with unknown fields is whitelisted and stays a nonreply', async () => {
    query.mockResolvedValueOnce({ rows: [['00000000-0000-4000-8000-000000000006']] });
    query.mockResolvedValueOnce({ rows: [plainRow] });
    const response = await request(app.getHttpServer())
      .post('/messages')
      .send({ receiverId, content: 'Hello', unexpected: 'field' })
      .expect(201);
    const [insertConfig] = query.mock.calls[0] as [{ text: string }, unknown[]];
    const body = response.body as { replyToId: string | null; replyTo: unknown };
    expect(insertConfig.text).toContain('insert into "messages"');
    expect(body.replyToId).toBeNull();
    expect(body.replyTo).toBeNull();
  });
});
