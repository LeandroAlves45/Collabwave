// Schemas Zod dos payloads HTTP de tasks.

import { z } from 'zod';

// Valores partilhados com os tipos de dominio.
const PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'] as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const createTaskSchema = z.object({
  columnId: z
    .string({ required_error: 'Column ID is required.' })
    .uuid('Column ID must be a valid UUID.'),

  title: z
    .string({ required_error: 'Task title is required.' })
    .trim()
    .min(1, 'Task title cannot be empty.')
    .max(255, 'Task title cannot exceed 255 characters.'),

  description: z
    .string()
    .trim()
    .max(2000, 'Task description cannot exceed 2000 characters.')
    .optional(),

  priority: z.enum(PRIORITY_VALUES).optional().default('medium'),

  dueDate: z
    .string()
    .regex(DATE_REGEX, 'Due date must be in YYYY-MM-DD format.')
    .optional(),

  assigneeId: z
    .string()
    .uuid('Assignee ID must be a valid UUID.')
    .optional(),
});

// PATCH aceita alteracoes parciais, mas rejeita body vazio.
export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Task title cannot be empty.')
      .max(255, 'Task title cannot exceed 255 characters.')
      .optional(),

    // null remove a descricao.
    description: z
      .string()
      .trim()
      .max(2000, 'Task description cannot exceed 2000 characters.')
      .nullable()
      .optional(),

    priority: z.enum(PRIORITY_VALUES).optional(),

    // null remove a due date.
    dueDate: z
      .string()
      .regex(DATE_REGEX, 'Due date must be in YYYY-MM-DD format.')
      .nullable()
      .optional(),

    // null remove o assignee.
    assigneeId: z
      .string()
      .uuid('Assignee ID must be a valid UUID.')
      .nullable()
      .optional(),
  })
  .refine((data => Object.keys(data).length > 0), {
    message: 'At least one field must be provided for update.',
  });

// Aceita a mesma coluna para suportar reordenacao vertical.
export const moveTaskSchema = z.object({
  targetColumnId: z
    .string({ required_error: 'Target column ID is required.' })
    .uuid('Target column ID must be a valid UUID.'),

  newPosition: z
    .number({ required_error: 'New position is required.' })
    .int('New position must be an integer.')
    .min(0, 'New position cannot be negative.'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
