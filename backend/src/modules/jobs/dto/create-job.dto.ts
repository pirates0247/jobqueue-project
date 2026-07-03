import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateJobDto {
  @IsOptional()
  @IsString()
  @IsIn(['IMMEDIATE', 'DELAYED', 'SCHEDULED', 'RECURRING', 'BATCH'])
  type?: string;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxRetries?: number;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsString()
  runAt?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  parentJobId?: string;
}
