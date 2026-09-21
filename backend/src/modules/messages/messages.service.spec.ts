import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { validate } from 'class-validator';
import { SendMessageDto } from './dtos/message.dto';
import { MessagesRepository } from './messages.repository';
import { MessagesService } from './messages.service';

const senderId = '00000000-0000-4000-8000-000000000001';
const receiverId = '00000000-0000-4000-8000-000000000002';
const thirdId = '00000000-0000-4000-8000-000000000003';
const replyToId = '00000000-0000-4000-8000-000000000004';

describe('MessagesService replies', () => {
  let service: MessagesService;
  const repository = {
    findReplyTarget: jest.fn<
      ReturnType<MessagesRepository['findReplyTarget']>,
      Parameters<MessagesRepository['findReplyTarget']>
    >(),
    send: jest.fn<ReturnType<MessagesRepository['send']>, Parameters<MessagesRepository['send']>>(),
  };
  const dto = { receiverId, content: 'A reply', replyToId };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [MessagesService, { provide: MessagesRepository, useValue: repository }],
    }).compile();
    service = module.get(MessagesService);
  });

  it.each([
    ['own', senderId, receiverId],
    ['peer', receiverId, senderId],
  ])('accepts a reply to an %s message in the exact pair', async (_, from, to) => {
    repository.findReplyTarget.mockResolvedValue({ senderId: from, receiverId: to });
    await service.send(senderId, dto);
    expect(repository.findReplyTarget).toHaveBeenCalledWith(replyToId);
    expect(repository.send).toHaveBeenCalledWith(senderId, dto);
  });

  it.each([
    ['missing', null],
    ['sender to third party', { senderId, receiverId: thirdId }],
    ['third party to sender', { senderId: thirdId, receiverId: senderId }],
    ['peer to third party', { senderId: receiverId, receiverId: thirdId }],
    ['third party to peer', { senderId: thirdId, receiverId }],
    ['self conversation', { senderId, receiverId: senderId }],
  ])('rejects %s targets without inserting or disclosing existence', async (_, target) => {
    repository.findReplyTarget.mockResolvedValue(target);
    await expect(service.send(senderId, dto)).rejects.toThrow(
      new NotFoundException('Reply target not found in this conversation'),
    );
    expect(repository.send).not.toHaveBeenCalled();
  });

  it('preserves nonreply sends without a target lookup', async () => {
    const plain = { receiverId, content: 'Hello' };
    await service.send(senderId, plain);
    expect(repository.findReplyTarget).not.toHaveBeenCalled();
    expect(repository.send).toHaveBeenCalledWith(senderId, plain);
  });
});

describe('SendMessageDto reply validation', () => {
  it.each([undefined, replyToId])('accepts omitted or UUID replyToId (%s)', async (value) => {
    const dto = Object.assign(new SendMessageDto(), {
      receiverId,
      content: 'Hello',
      replyToId: value,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it.each(['not-a-uuid', '', 123, null])('rejects invalid replyToId (%s)', async (value) => {
    const dto = Object.assign(new SendMessageDto(), {
      receiverId,
      content: 'Hello',
      replyToId: value,
    });
    expect((await validate(dto)).map((error) => error.property)).toContain('replyToId');
  });
});
