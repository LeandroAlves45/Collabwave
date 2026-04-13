// ============================================================
// CollabWave — Express Type Augmentation
// ============================================================
// Estende o tipo Request do Express para incluir req.user,
// preenchido pelo middleware authenticate após validação do JWT.
//
// Esta declaração é global e aplicada automaticamente a todos
// os ficheiros que importem tipos do Express — não é necessário
// importar este ficheiro explicitamente.
// ============================================================

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export {};
