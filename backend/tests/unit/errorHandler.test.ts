// ============================================================
// CollabWave — Unit Tests: errorHandler middleware
// ============================================================
// Testa os três ramos do errorHandler em isolamento:
//   1. ZodError   → 400 com lista de campos
//   2. AppError   → statusCode do erro
//   3. Error genérico → 500 (mensagem varia por NODE_ENV)
//
// Não precisa de mocks externos — testamos a função directamente
// passando objectos req/res/next simulados (test doubles simples).
// ============================================================

import { ZodError, ZodIssueCode } from 'zod';
import { errorHandler, AppError } from '../../src/middleware/errorHandler.js';
import type { Request, Response, NextFunction } from 'express';

// Helper: cria um mock mínimo do Response do Express.
// Captura o statusCode e o body chamado via .json().
function makeRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    send() {
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

const req = {} as Request;
const next = jest.fn() as unknown as NextFunction;

// ----------------------------------------------------------------
// SUITE: ZodError
// ----------------------------------------------------------------
describe('errorHandler — ZodError', () => {
  it('returns 400 with validation failed status', () => {
    const zodErr = new ZodError([
      {
        code: ZodIssueCode.too_small,
        minimum: 1,
        type: 'string',
        inclusive: true,
        exact: false,
        message: 'Title cannot be empty',
        path: ['title'],
      },
    ]);

    const res = makeRes();
    errorHandler(zodErr, req, res, next);

    expect(res.statusCode).toBe(400);
    expect((res.body as Record<string, unknown>).status).toBe('error');
    expect((res.body as Record<string, unknown>).message).toBe(
      'Validation failed.',
    );
  });

  it('maps each ZodIssue to field and message', () => {
    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'undefined',
        message: 'Required',
        path: ['columnId'],
      },
      {
        code: ZodIssueCode.too_big,
        maximum: 255,
        type: 'string',
        inclusive: true,
        exact: false,
        message: 'Too long',
        path: ['title'],
      },
    ]);

    const res = makeRes();
    errorHandler(zodErr, req, res, next);

    const errors = (res.body as Record<string, unknown>).errors as Array<{
      field: string;
      message: string;
    }>;
    expect(errors).toHaveLength(2);
    expect(errors[0]).toEqual({ field: 'columnId', message: 'Required' });
    expect(errors[1]).toEqual({ field: 'title', message: 'Too long' });
  });

  it('joins nested path segments with a dot', () => {
    const zodErr = new ZodError([
      {
        code: ZodIssueCode.invalid_type,
        expected: 'string',
        received: 'null',
        message: 'Expected string',
        path: ['payload', 'nested', 'field'],
      },
    ]);

    const res = makeRes();
    errorHandler(zodErr, req, res, next);

    const errors = (res.body as Record<string, unknown>).errors as Array<{
      field: string;
    }>;
    expect(errors[0].field).toBe('payload.nested.field');
  });
});

// ----------------------------------------------------------------
// SUITE: AppError
// ----------------------------------------------------------------
describe('errorHandler — AppError', () => {
  it('returns the statusCode set in the AppError', () => {
    const res = makeRes();
    errorHandler(new AppError('Not found', 404), req, res, next);
    expect(res.statusCode).toBe(404);
  });

  it('returns the message from the AppError', () => {
    const res = makeRes();
    errorHandler(new AppError('Forbidden', 403), req, res, next);
    expect((res.body as Record<string, unknown>).message).toBe('Forbidden');
    expect((res.body as Record<string, unknown>).status).toBe('error');
  });

  it('handles 400 AppError correctly', () => {
    const res = makeRes();
    errorHandler(
      new AppError('Assignee is not a member of this workspace', 400),
      req,
      res,
      next,
    );
    expect(res.statusCode).toBe(400);
  });

  it('handles 500 AppError correctly', () => {
    const res = makeRes();
    errorHandler(new AppError('Internal error', 500), req, res, next);
    expect(res.statusCode).toBe(500);
  });
});

// ----------------------------------------------------------------
// SUITE: Generic Error (unexpected)
// ----------------------------------------------------------------
describe('errorHandler — Generic Error', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('returns 500 for an unexpected error', () => {
    process.env.NODE_ENV = 'production';
    const res = makeRes();
    errorHandler(new Error('Something broke'), req, res, next);
    expect(res.statusCode).toBe(500);
    expect((res.body as Record<string, unknown>).status).toBe('error');
  });

  it('returns generic message in production', () => {
    process.env.NODE_ENV = 'production';
    const res = makeRes();
    errorHandler(new Error('DB connection lost'), req, res, next);
    const body = res.body as Record<string, unknown>;
    expect(body.message).toBe(
      'An unexpected error occurred. Please try again later.',
    );
  });

  it('returns actual error message in development', () => {
    process.env.NODE_ENV = 'development';
    const res = makeRes();
    errorHandler(new Error('DB connection lost'), req, res, next);
    const body = res.body as Record<string, unknown>;
    expect(body.message).toBe('DB connection lost');
  });
});
