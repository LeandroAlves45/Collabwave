// Schemas Zod dos payloads HTTP de workspaces.

import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z
    .string({ required_error: 'Workspace name is required.' })
    .trim()
    .min(2, 'Workspace name must be at least 2 characters.')
    .max(100, 'Workspace name must not exceed 100 characters.'),

  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters.')
    .optional(),
});

export const joinWorkspaceSchema = z.object({
  inviteCode: z
    .string({ required_error: 'Invite code is required.' })
    .trim()
    .length(6, 'Invite code must be exactly 6 characters.')
    .toUpperCase(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type JoinWorkspaceInput = z.infer<typeof joinWorkspaceSchema>;
