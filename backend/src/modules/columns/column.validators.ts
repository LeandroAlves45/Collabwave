// Schemas Zod dos payloads HTTP de colunas.

import { z } from 'zod';

export const createColumnSchema = z.object({
  title: z
    .string({ required_error: 'Title is required.' })
    .min(1, { message: 'Title must be at least 1 character long.' })
    .max(100, 'Title cannot exceed 100 characters.'),
});

export const updateColumnSchema = z.object({
  title: z
    .string({ required_error: 'Title is required.' })
    .min(1, { message: 'Title must be at least 1 character long.' })
    .max(100, 'Title cannot exceed 100 characters.'),
});

export const reorderColumnSchema = z.object({
  newPosition: z
    .number({ required_error: 'New position is required.' })
    .int('New position must be an integer.')
    .min(0, 'New position cannot be negative.'),
});

export type CreateColumnPayload = z.infer<typeof createColumnSchema>;
export type UpdateColumnPayload = z.infer<typeof updateColumnSchema>;
export type ReorderColumnPayload = z.infer<typeof reorderColumnSchema>;
