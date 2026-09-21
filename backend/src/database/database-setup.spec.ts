import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import {
  getMigrationsFolder,
  isDatabaseAutoSeedEnabled,
  isDatabaseAutoSetupEnabled,
  loadEnvironmentFiles,
} from '@config';
import { runDatabaseSetup } from './database-setup';
import { runCoursesSeed } from './seeds/courses.seed';
import { runNigerianSecondarySeed } from './seeds/nigerian-secondary.seed';

const mockPoolEnd = jest.fn().mockResolvedValue(undefined);

jest.mock('@config', () => ({
  getDatabaseUrl: jest.fn(() => 'postgres://localhost:5432/test'),
  getMigrationsFolder: jest.fn(() => '/srv/app/drizzle'),
  isDatabaseAutoSeedEnabled: jest.fn(() => false),
  isDatabaseAutoSetupEnabled: jest.fn(() => false),
  loadEnvironmentFiles: jest.fn(),
}));

jest.mock('drizzle-orm/node-postgres', () => ({
  drizzle: jest.fn(() => ({ query: {} })),
}));

jest.mock('drizzle-orm/node-postgres/migrator', () => ({
  migrate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({ end: mockPoolEnd })),
}));

jest.mock('./seeds/nigerian-secondary.seed', () => ({
  runNigerianSecondarySeed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./seeds/courses.seed', () => ({
  runCoursesSeed: jest.fn().mockResolvedValue(undefined),
}));

const setupEnabled = jest.mocked(isDatabaseAutoSetupEnabled);
const seedEnabled = jest.mocked(isDatabaseAutoSeedEnabled);

describe('runDatabaseSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupEnabled.mockReturnValue(false);
    seedEnabled.mockReturnValue(false);
  });

  it('does nothing while DB_AUTO_SETUP is off', async () => {
    const result = await runDatabaseSetup();

    expect(result).toEqual({ migrated: false, seeded: false });
    expect(Pool).not.toHaveBeenCalled();
    expect(migrate).not.toHaveBeenCalled();
    expect(loadEnvironmentFiles).not.toHaveBeenCalled();
  });

  it('applies migrations when setup is on and seeding is off', async () => {
    setupEnabled.mockReturnValue(true);

    const result = await runDatabaseSetup();

    expect(result).toEqual({ migrated: true, seeded: false });
    expect(loadEnvironmentFiles).toHaveBeenCalled();
    expect(migrate).toHaveBeenCalledTimes(1);
    expect(getMigrationsFolder).toHaveBeenCalled();
    expect(migrate).toHaveBeenCalledWith(expect.anything(), {
      migrationsFolder: '/srv/app/drizzle',
    });
    expect(runNigerianSecondarySeed).not.toHaveBeenCalled();
    expect(runCoursesSeed).not.toHaveBeenCalled();
    expect(mockPoolEnd).toHaveBeenCalledTimes(1);
  });

  it('seeds demo data after migrating when both flags are on', async () => {
    setupEnabled.mockReturnValue(true);
    seedEnabled.mockReturnValue(true);

    const result = await runDatabaseSetup();

    expect(result).toEqual({ migrated: true, seeded: true });
    expect(runNigerianSecondarySeed).toHaveBeenCalledTimes(1);
    expect(runCoursesSeed).toHaveBeenCalledTimes(1);

    const migrateOrder = jest.mocked(migrate).mock.invocationCallOrder[0];
    expect(migrateOrder).toBeLessThan(
      jest.mocked(runNigerianSecondarySeed).mock.invocationCallOrder[0],
    );
    expect(migrateOrder).toBeLessThan(jest.mocked(runCoursesSeed).mock.invocationCallOrder[0]);
    expect(mockPoolEnd).toHaveBeenCalledTimes(1);
  });

  it('releases the pool and rethrows when a migration fails', async () => {
    setupEnabled.mockReturnValue(true);
    jest.mocked(migrate).mockRejectedValueOnce(new Error('connection refused'));

    await expect(runDatabaseSetup()).rejects.toThrow('connection refused');

    expect(mockPoolEnd).toHaveBeenCalledTimes(1);
    expect(runNigerianSecondarySeed).not.toHaveBeenCalled();
  });

  it('releases the pool and rethrows when seeding fails', async () => {
    setupEnabled.mockReturnValue(true);
    seedEnabled.mockReturnValue(true);
    jest.mocked(runCoursesSeed).mockRejectedValueOnce(new Error('seed exploded'));

    await expect(runDatabaseSetup()).rejects.toThrow('seed exploded');

    expect(mockPoolEnd).toHaveBeenCalledTimes(1);
  });
});
