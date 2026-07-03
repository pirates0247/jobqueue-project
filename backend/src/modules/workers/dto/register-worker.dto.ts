import { IsOptional, IsInt, IsString, Min, Max, IsObject } from 'class-validator';

export class RegisterWorkerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  hostname?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  concurrency?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
