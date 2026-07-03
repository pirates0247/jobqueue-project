export class ApiResponseDto<T> {
  success: boolean;
  data: T;
  timestamp: string;
  path?: string;

  constructor(data: T, path?: string) {
    this.success = true;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.path = path;
  }
}

export class PaginatedResponseDto<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;

  constructor(data: T[], page: number, limit: number, total: number) {
    this.success = true;
    this.data = data;
    this.meta = {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
    this.timestamp = new Date().toISOString();
  }
}
