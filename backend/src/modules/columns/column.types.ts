// Tipos de colunas. Registos da BD usam snake_case.
export interface Column {
  id: string; // UUID
  workspace_id: string;
  title: string;
  position: number;
}

export interface CreateColumnPayload {
  title: string;
}

export interface UpdateColumnPayload {
  title: string;
}

export interface ReorderColumnPayload {
  newPosition: number;
}
