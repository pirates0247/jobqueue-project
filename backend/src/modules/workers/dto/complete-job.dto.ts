import { IsOptional, IsString } from 'class-validator';

export class CompleteJobDto {
  @IsOptional()
  @IsString()
  result?: string;
}
