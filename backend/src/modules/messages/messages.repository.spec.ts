import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '@database/schema';
import { MessagesRepository } from './messages.repository';

const senderId = '00000000-0000-4000-8000-000000000001';
const receiverId = '00000000-0000-4000-8000-000000000002';
const id = '00000000-0000-4000-8000-000000000003';
const originalId = '00000000-0000-4000-8000-000000000004';
const createdAt = '2026-09-17T12:00:00.000Z';

// Exercise real Drizzle SQL generation and row mapping, without connecting to any DB.
describe('MessagesRepository persisted reply contract', () => {
  const query = jest.fn();
  const db = drizzle({ query } as unknown as Pool, { schema });
  const repository = new MessagesRepository(db);
  const plainRow = [
    id,
    senderId,
    receiverId,
    'Hello',
    null,
    null,
    createdAt,
    'Ada A',
    false,
    null,
    null,
    null,
    null,
  ];
  const replyRow = [
    id,
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

  beforeEach(() => query.mockReset());

  it('loads an entire thread in one joined query with null or populated reply previews', async () => {
    query.mockResolvedValue({ rows: [plainRow, replyRow] });
    const rows = await repository.getConversation(senderId, receiverId);
    expect(query).toHaveBeenCalledTimes(1);
    const [config, params] = query.mock.calls[0] as [{ text: string }, unknown[]];
    expect(config.text).toContain('left join "messages" "reply_message"');
    expect(config.text).toContain('left join "users" "reply_sender"');
    expect(config.text).toContain('order by "messages"."created_at" asc');
    expect(params).toEqual([senderId, receiverId, receiverId, senderId]);
    expect(rows[0]).toEqual({
      id,
      senderId,
      receiverId,
      content: 'Hello',
      readAt: null,
      createdAt: new Date(createdAt),
      senderName: 'Ada A',
      senderIsVerified: false,
      replyToId: null,
      replyTo: null,
    });
    expect(rows[1].replyToId).toBe(originalId);
    expect(rows[1].replyTo).toEqual({
      id: originalId,
      content: 'Question',
      senderId: receiverId,
      senderName: 'Sam B',
    });
    expect(rows[1].senderIsVerified).toBe(true);
  });

  it.each([undefined, originalId])(
    'persists replyToId (%s) and returns enriched send output',
    async (replyToId) => {
      query.mockResolvedValueOnce({ rows: [[id]] });
      query.mockResolvedValueOnce({ rows: [replyToId ? replyRow : plainRow] });
      const result = await repository.send(senderId, { receiverId, content: 'Hello', replyToId });
      expect(query).toHaveBeenCalledTimes(2);
      const [config, params] = query.mock.calls[0] as [{ text: string }, unknown[]];
      expect(config.text).toContain('insert into "messages"');
      expect(config.text).toContain('"reply_to_id"');
      expect(params).toEqual([senderId, receiverId, 'Hello', replyToId ?? null]);
      expect(result.replyToId).toBe(replyToId ?? null);
      expect(result.replyTo).toEqual(
        replyToId
          ? { id: originalId, content: 'Question', senderId: receiverId, senderName: 'Sam B' }
          : null,
      );
    },
  );
});
