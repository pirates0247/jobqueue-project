import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ClaimJobsDto {
  @IsString({ each: true })
  queueIds: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
