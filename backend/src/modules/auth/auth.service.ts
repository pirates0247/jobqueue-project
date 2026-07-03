import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import * as argon2 from 'argon2';
import { User } from '@prisma/client';
import ms from './ms.util';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RequestMetadata {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
    meta: RequestMetadata,
  ): Promise<{ user: User; tokens: TokenPair }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const tokens = await this.issueTokenPair(user, meta);
    return { user, tokens };
  }

  async login(dto: LoginDto, meta: RequestMetadata): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const tokens = await this.issueTokenPair(user, meta);
    return { user, tokens };
  }

  /**
   * Rotates a refresh token: validates the presented token against the stored
   * hash, revokes it, and issues a brand new access/refresh pair. Rotation
   * prevents replay of stolen refresh tokens after first use.
   */
  async refresh(
    userId: string,
    presentedToken: string,
    meta: RequestMetadata,
  ): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer exists or is inactive');
    }

    const tokenHash = this.hashToken(presentedToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId, tokenHash, revoked: false },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token is invalid or has already been used');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const tokens = await this.issueTokenPair(user, meta);
    return { user, tokens };
  }

  async logout(userId: string, presentedToken: string): Promise<void> {
    const tokenHash = this.hashToken(presentedToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revoked: false },
      data: { revoked: true },
    });
  }

  async logoutAllSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  private async issueTokenPair(user: User, meta: RequestMetadata): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.accessSecret'),
      expiresIn: this.configService.get<string>('auth.accessExpiresIn'),
    });

    const refreshExpiresIn = this.configService.get<string>('auth.refreshExpiresIn')!;
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.refreshSecret'),
      expiresIn: refreshExpiresIn,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: new Date(Date.now() + ms(refreshExpiresIn)),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  get refreshCookieMaxAgeMs(): number {
    return ms(this.configService.get<string>('auth.refreshExpiresIn')!);
  }
}
