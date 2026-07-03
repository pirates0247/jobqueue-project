import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.register(dto, this.extractMeta(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return this.toResponse(user, tokens.accessToken);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.login(dto, this.extractMeta(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return this.toResponse(user, tokens.accessToken);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser('id') userId: string,
    @Req() req: Request & { user: { refreshToken: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const presentedToken = req.user.refreshToken;
    const { user, tokens } = await this.authService.refresh(
      userId,
      presentedToken,
      this.extractMeta(req),
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return this.toResponse(user, tokens.accessToken);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request & { user: { refreshToken: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(userId, req.user.refreshToken);
    res.clearCookie(REFRESH_COOKIE);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(
    @CurrentUser() user: { id: string; email: string },
  ): Promise<{ id: string; email: string }> {
    return user;
  }

  private extractMeta(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.configService.get<string>('env') === 'production',
      sameSite: 'lax',
      maxAge: this.authService.refreshCookieMaxAgeMs,
      path: '/api/v1/auth',
    });
  }

  private toResponse(
    user: { id: string; email: string; firstName: string; lastName: string },
    accessToken: string,
  ): AuthResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      accessToken,
    };
  }
}
