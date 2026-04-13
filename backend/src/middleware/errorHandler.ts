// ============================================================
// CollabWave - Global Error Handler Middleware
// ============================================================
// Intercepta todos os erros não tratados na aplicação e
// devolve sempre uma resposta JSON consistente ao cliente.
//
// Em Express, um middleware de erro distingue-se dos outros
// por ter QUATRO parâmetros: (err, req, res, next).
// O Express detecta esta assinatura e usa este middleware
// apenas quando um erro é passado via next(err).
// ============================================================

import { Request, Response, NextFunction } from 'express';

// ------------------------------------------------------------
// AppError - Classe de erro customizada
// ------------------------------------------------------------
// Usa-se esta classe para distinguir erros operacionais
// (que antecipa, como "email já existe") de erros de
// programação (bugs inesperados como referências nulas).

export class AppError extends Error {
  // Código de status HTTP a devolver (e.g., 400, 404, 500)
  public readonly statusCode: number;

  // Flag para indicar se é um erro operacional (vs. erro de programação)
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    // Chama o construtor da classe base Error
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true; // Por padrão, assume que é um erro operacional

    // Garante que o stack trace aponta para o local onde o erro foi criado
    Error.captureStackTrace(this, this.constructor);
  }
}

// ------------------------------------------------------------
// errorHandler - Middleware de tratamento de erros
// ------------------------------------------------------------
// Este middleware deve ser adicionado APÓS todas as rotas e outros
// middlewares. Ele captura qualquer erro passado via next(err) e
// devolve uma resposta JSON consistente.
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // _next é obrigatório para o Express reconhecer esta função como middleware de erro (4 parâmetros), mesmo que não seja usado
  _next: NextFunction,
): void {
  // Se o erro for uma instância de AppError, é um erro operacional
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Para erros inesperados (bugs), logamos o stack trace para diagnóstico
  console.error('Unexpected Error:', err);

  // Em desenvolvimento, incluímos a stack trace na resposta para facilitar o debug
  const message =
    process.env.NODE_ENV === 'development'
      ? err.message
      : 'An unexpected error occurred. Please try again later.';

  res.status(500).json({
    status: 'error',
    message,
  });
}
