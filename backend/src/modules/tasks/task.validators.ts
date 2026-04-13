// ============================================================
// CollabWave — Task Module Validators
// ============================================================
// Schemas Zod para validação dos request bodies do módulo de tasks.
//
// SCHEMAS:
//   createTaskSchema   → POST /api/workspaces/:id/tasks
//   updateTaskSchema   → PATCH /api/tasks/:taskId
//   moveTaskSchema     → PATCH /api/tasks/:taskId/move
//
// PADRÃO:
//   1. Schema Zod define regras de validação e transformações
//   2. Tipo TypeScript inferido com z.infer<typeof schema>
//   3. Controller chama .parse(req.body) — lança ZodError se inválido
//      O errorHandler global trata ZodError e devolve 400 ao cliente
// ============================================================

import { z } from 'zod';

// --------------------------------------------------------------
// Constantes partilhadas
// --------------------------------------------------------------
// Centralizar os valores do enum de prioridade evita duplicação e garante consistência.
const PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'] as const;

// Regex para validar o formato da data ISO 8601 (ex: "YYYY-MM-DD")
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// --------------------------------------------------------------
// createTaskSchema
// --------------------------------------------------------------
// Valida o body de POST /api/workspaces/:id/tasks
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

  // z.enum() garante que só os 4 valores definidos são aceitos
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

// --------------------------------------------------------------
// updateTaskSchema
// ---------------------------------------------------------------
// Valida o body de PATCH /api/tasks/:taskId
//
// Regras:
//   Campos são opcionais, o cliente envia apenas o que muda.
//   description e dueDate e assigneeId aceitam null para remover o valor.
//   O body não pode ser completamente vazio (.refine).
//
// PORQUÊ .refine()?
//   Um PATCH com body vazio {} passaria a validação de campos
//   (todos opcionais) mas é uma operação inútil. O .refine() garante
//   que pelo menos um campo foi enviado, devolvendo 400 caso contrário.
export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Task title cannot be empty.')
      .max(255, 'Task title cannot exceed 255 characters.')
      .optional(),

    // .nullable() permite que o cliente envie null para remover a descrição
    description: z
      .string()
      .trim()
      .max(2000, 'Task description cannot exceed 2000 characters.')
      .nullable()
      .optional(),

    priority: z.enum(PRIORITY_VALUES).optional(),

    // null remove a due date, string atualiza
    dueDate: z
      .string()
      .regex(DATE_REGEX, 'Due date must be in YYYY-MM-DD format.')
      .nullable()
      .optional(),

    // null remove o assignee, string atualiza
    assigneeId: z
      .string()
      .uuid('Assignee ID must be a valid UUID.')
      .nullable()
      .optional(),
  })
  // Garante que pelo menos um campo foi enviado para atualização
  .refine((data => Object.keys(data).length > 0), {
    message: 'At least one field must be provided for update.',
  });

// --------------------------------------------------------------
// moveTaskSchema
// --------------------------------------------------------------
// Valida o body de PATCH /api/tasks/:taskId/move
//
// Regras:
//   targetColumnId → obrigatório, UUID válido (pode ser a mesma coluna)
//   newPosition    → obrigatório, inteiro >= 0 (0 = primeiro na coluna)
//
// PORQUÊ aceitar a mesma coluna como targetColumnId?
//   Permite reordenar tasks dentro da mesma coluna (drag-and-drop
//   vertical) com o mesmo endpoint, sem precisar de lógica especial
//   no frontend. O service trata ambos os casos.
export const moveTaskSchema = z.object({
  targetColumnId: z
    .string({ required_error: 'Target column ID is required.' })
    .uuid('Target column ID must be a valid UUID.'),

  // z.number().int() rejeita decimais (ex: 1.5), min(0) rejeita negativos
  newPosition: z
    .number({ required_error: 'New position is required.' })
    .int('New position must be an integer.')
    .min(0, 'New position cannot be negative.'),
});

// --------------------------------------------------------------
// Tipos inferidos dos schemas
// --------------------------------------------------------------
// Usados nos controllers para tipar o req.body após validação.

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
//    { columnID: string; title: string; description?: string;
//    priority?: 'low' | 'medium' | 'high' | 'urgent'; dueDate?: string; 
//    assigneeId?: string }

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
//    { title?: string; description?: string | null;
//    priority?: 'low' | 'medium' | 'high' | 'urgent'; dueDate?: string | null;
//    assigneeId?: string | null }

export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
//    { targetColumnId: string; newPosition: number }