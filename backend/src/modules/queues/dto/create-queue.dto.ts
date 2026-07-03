import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { RetryStrategy } from '@prisma/client';

export class CreateQueueDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

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
  @IsString()
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
