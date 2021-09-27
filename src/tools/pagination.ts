export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}

export interface PaginatedRequest {
  start?: number;
  limit?: number;
}
