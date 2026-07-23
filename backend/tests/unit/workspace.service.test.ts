jest.mock('../../src/config/database.js');

import db from '../../src/config/database.js';
import * as workspaceService from '../../src/modules/workspaces/workspace.service.js';

function query(value: unknown) {
  const builder: Record<string, jest.Mock> = {};
  for (const method of ['where', 'join', 'select', 'insert', 'orderBy']) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  builder.first = jest.fn().mockResolvedValue(value);
  builder.returning = jest.fn().mockResolvedValue(value);
  builder.then = jest
    .fn()
    .mockImplementation((resolve: (result: unknown) => unknown) =>
      Promise.resolve(resolve(value)),
    );
  return builder;
}

const mockDb = db as unknown as jest.Mock & { transaction: jest.Mock };

function transactionWith(
  queues: Record<string, Array<Record<string, jest.Mock>>>,
): jest.Mock {
  return jest.fn(async (callback: (trx: jest.Mock) => Promise<unknown>) => {
    const trx = jest.fn((table: string) => queues[table].shift());
    return callback(trx);
  });
}

const workspace = {
  id: 'workspace-1',
  name: 'Team Alpha',
  description: null,
  owner_id: 'user-1',
  invite_code: 'ABC123',
  created_at: new Date('2026-01-01'),
};

describe('workspace.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createWorkspace', () => {
    it('creates the workspace, owner membership and default columns on the first attempt', async () => {
      mockDb.transaction = transactionWith({
        workspaces: [query([workspace])],
        workspace_members: [query(undefined)],
        columns: [query(undefined)],
      });

      const result = await workspaceService.createWorkspace('user-1', {
        name: 'Team Alpha',
      });

      expect(result).toEqual(workspace);
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('retries with a new invite code when it collides and succeeds on the next attempt', async () => {
      const collisionError = {
        code: '23505',
        constraint: 'workspaces_invite_code_unique',
      };
      let attempt = 0;
      mockDb.transaction = jest.fn(
        async (callback: (trx: jest.Mock) => Promise<unknown>) => {
          attempt += 1;
          if (attempt === 1) {
            throw collisionError;
          }
          const trx = jest.fn((table: string) => {
            if (table === 'workspaces') return query([workspace]);
            return query(undefined);
          });
          return callback(trx);
        },
      );

      const result = await workspaceService.createWorkspace('user-1', {
        name: 'Team Alpha',
      });

      expect(result).toEqual(workspace);
      expect(mockDb.transaction).toHaveBeenCalledTimes(2);
    });

    it('rethrows immediately when the error is not an invite code collision', async () => {
      const unexpectedError = new Error('connection lost');
      mockDb.transaction = jest.fn().mockRejectedValueOnce(unexpectedError);

      await expect(
        workspaceService.createWorkspace('user-1', { name: 'Team Alpha' }),
      ).rejects.toBe(unexpectedError);
      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('throws after exhausting all invite code collision attempts', async () => {
      const collisionError = {
        code: '23505',
        constraint: 'workspaces_invite_code_unique',
      };
      mockDb.transaction = jest.fn().mockRejectedValue(collisionError);

      await expect(
        workspaceService.createWorkspace('user-1', { name: 'Team Alpha' }),
      ).rejects.toBe(collisionError);
      expect(mockDb.transaction).toHaveBeenCalledTimes(5);
    });
  });

  it('getUserWorkspaces returns the workspaces the user is a member of', async () => {
    const rows = [{ ...workspace, role: 'owner' }];
    mockDb.mockReturnValueOnce(query(rows));

    const result = await workspaceService.getUserWorkspaces('user-1');

    expect(result).toEqual(rows);
  });

  describe('getWorkspaceById', () => {
    it('returns the workspace when it exists', async () => {
      mockDb.mockReturnValueOnce(query(workspace));

      const result = await workspaceService.getWorkspaceById('workspace-1');

      expect(result).toEqual(workspace);
    });

    it('throws AppError 404 when the workspace does not exist', async () => {
      mockDb.mockReturnValueOnce(query(undefined));

      await expect(
        workspaceService.getWorkspaceById('missing'),
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('joinWorkspaceByInviteCode', () => {
    it('throws AppError 404 when the invite code is invalid', async () => {
      mockDb.mockReturnValueOnce(query(undefined));

      await expect(
        workspaceService.joinWorkspaceByInviteCode('user-1', 'BADCODE'),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws AppError 409 when the user is already a member', async () => {
      mockDb
        .mockReturnValueOnce(query(workspace))
        .mockReturnValueOnce(
          query({ workspace_id: 'workspace-1', user_id: 'user-1' }),
        );

      await expect(
        workspaceService.joinWorkspaceByInviteCode('user-1', 'ABC123'),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('adds the user as a member when the invite code is valid and unused', async () => {
      const insertQuery = query(undefined);
      mockDb
        .mockReturnValueOnce(query(workspace))
        .mockReturnValueOnce(query(undefined))
        .mockReturnValueOnce(insertQuery);

      const result = await workspaceService.joinWorkspaceByInviteCode(
        'user-1',
        'ABC123',
      );

      expect(result).toEqual(workspace);
      expect(insertQuery.insert).toHaveBeenCalledWith({
        workspace_id: 'workspace-1',
        user_id: 'user-1',
        role: 'member',
      });
    });
  });

  it('getWorkspaceMembers returns the members joined with user data', async () => {
    const members = [
      {
        user_id: 'user-1',
        name: 'Ana',
        email: 'ana@example.com',
        role: 'owner',
      },
    ];
    mockDb.mockReturnValueOnce(query(members));

    const result = await workspaceService.getWorkspaceMembers('workspace-1');

    expect(result).toEqual(members);
  });

  describe('checkMembership', () => {
    it('returns the membership role when the user is a member', async () => {
      mockDb.mockReturnValueOnce(query({ role: 'admin' }));

      const result = await workspaceService.checkMembership(
        'workspace-1',
        'user-1',
      );

      expect(result).toEqual({ role: 'admin' });
    });

    it('returns null when the user is not a member', async () => {
      mockDb.mockReturnValueOnce(query(undefined));

      const result = await workspaceService.checkMembership(
        'workspace-1',
        'user-2',
      );

      expect(result).toBeNull();
    });
  });
});
