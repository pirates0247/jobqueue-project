import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { RetryStrategy } from '@prisma/client';

export class UpdateQueueDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  concurrencyLimit?: number;

  @IsOptional()
  @IsEnum(RetryStrategy)
  retryStrategy?: RetryStrategy;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxRetries?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3600000)
  baseRetryDelayMs?: number;
}
