export class UserSummaryDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export class AuthResponseDto {
  user: UserSummaryDto;
  accessToken: string;
  // refreshToken is intentionally omitted here; it is set as an httpOnly cookie.
}
