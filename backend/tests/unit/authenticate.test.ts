// ============================================================
// CollabWave — Unit Tests: authenticate middleware
// ============================================================
// Testa os ramos do middleware authenticate em isolamento:
//   1. Sem header Authorization           → AppError 401
//   2. Header sem prefixo "Bearer "       → AppError 401
//   3. Token expirado                     → AppError 401
//   4. Token com assinatura inválida      → AppError 401
//   5. Token válido                       → req.user preenchido, next()
//
// jwt.verify é mockado para controlar o comportamento sem
// depender de chaves reais ou timings de expiração.
// ============================================================

jest.mock('jsonwebtoken');

import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { AppError } from '../../src/middleware/errorHandler.js';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeReq(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as unknown as Request;
}

function makeNext(): jest.MockedFunction<NextFunction> {
  return jest.fn() as unknown as jest.MockedFunction<NextFunction>;
}

const res = {} as Response;

const validPayload = {
  sub: 'user-uuid-1',
  email: 'user@test.com',
  name: 'Test User',
  jti: 'jti-1',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900,
};

// ----------------------------------------------------------------
// SUITE: Missing / malformed Authorization header
// ----------------------------------------------------------------
describe('authenticate — missing or malformed header', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next with AppError 401 when Authorization header is absent', () => {
    const req = makeReq();
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as unknown as AppError;
    expect(err.statusCode).toBe(401);
  });

  it('calls next with AppError 401 when header does not start with "Bearer "', () => {
    const req = makeReq('Basic dXNlcjpwYXNz');
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as unknown as AppError;
    expect(err.statusCode).toBe(401);
  });
});

// ----------------------------------------------------------------
// SUITE: Invalid tokens
// ----------------------------------------------------------------
describe('authenticate — invalid tokens', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next with AppError 401 when token is expired', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new jwt.TokenExpiredError('jwt expired', new Date());
    });

    const req = makeReq('Bearer expired.token.here');
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as unknown as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/expired/i);
  });

  it('calls next with AppError 401 when token signature is invalid', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new jwt.JsonWebTokenError('invalid signature');
    });

    const req = makeReq('Bearer bad.token.signature');
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as unknown as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/invalid/i);
  });

  it('calls next with the raw error for unexpected jwt errors', () => {
    const unexpectedError = new Error('unexpected key error');
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw unexpectedError;
    });

    const req = makeReq('Bearer some.token');
    const next = makeNext();

    authenticate(req, res, next);

    // Not wrapped in AppError — passed through as-is
    expect(next).toHaveBeenCalledWith(unexpectedError);
  });
});

// ----------------------------------------------------------------
// SUITE: Valid token
// ----------------------------------------------------------------
describe('authenticate — valid token', () => {
  beforeEach(() => jest.clearAllMocks());

  it('populates req.user with id, email and name from payload', () => {
    (jwt.verify as jest.Mock).mockReturnValue(validPayload);

    const req = makeReq('Bearer valid.token.here');
    const next = makeNext();

    authenticate(req, res, next);

    expect((req as Request & { user: unknown }).user).toEqual({
      id: validPayload.sub,
      email: validPayload.email,
      name: validPayload.name,
    });
  });

  it('calls next() with no arguments on success', () => {
    (jwt.verify as jest.Mock).mockReturnValue(validPayload);

    const req = makeReq('Bearer valid.token.here');
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(); // called with zero arguments
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('strips the "Bearer " prefix before verifying', () => {
    (jwt.verify as jest.Mock).mockReturnValue(validPayload);

    const req = makeReq('Bearer the.actual.token');
    const next = makeNext();

    authenticate(req, res, next);

    // jwt.verify should receive only the token, not "Bearer the.actual.token"
    expect(jwt.verify).toHaveBeenCalledWith(
      'the.actual.token',
      expect.any(String),
    );
  });
});