export class OrganizationResponseDto {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class OrganizationListResponseDto {
  organizations: OrganizationResponseDto[];
}
