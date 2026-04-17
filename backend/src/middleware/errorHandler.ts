// Error handler global: converte qualquer erro lancado pela API em uma
// resposta JSON previsivel para o frontend.
// A assinatura com 4 parametros e obrigatoria para o Express identificar este
// middleware como tratador de erros.

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;

  // Marca erros "controlados", como login invalido ou recurso nao encontrado.
  // Isso ajuda a separar falhas esperadas de bugs inesperados no servidor.
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;

    // Mantem o stack trace apontando para onde o AppError foi criado,
    // removendo o constructor da pilha para facilitar o debug.
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // Mantido para o Express reconhecer este middleware de erro.
  _next: NextFunction,
): void {
  // Erros do Zod indicam que o corpo, params ou query da request nao passaram
  // na validacao. Retornamos os campos invalidos para o frontend poder mostrar
  // mensagens especificas ao utilizador.
  if (err instanceof ZodError) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed.',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // AppError representa erros intencionais da regra de negocio. Nestes casos,
  // confiamos no statusCode definido no local onde o erro foi lancado.
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Erros inesperados ficam no log; a resposta publica nao expoe detalhes em
  // producao para evitar vazamento de informacoes internas.
  console.error('Unexpected Error:', err);

  // Em desenvolvimento, mostrar a mensagem real acelera o debug. Em producao,
  // devolvemos uma mensagem generica e mantemos o detalhe apenas no log.
  const message =
    process.env.NODE_ENV === 'development'
      ? err.message
      : 'An unexpected error occurred. Please try again later.';

  res.status(500).json({
    status: 'error',
    message,
  });
}
