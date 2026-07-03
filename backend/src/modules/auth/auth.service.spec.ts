import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUser.passwordHash = await argon2.hash('StrongPass1');

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            refreshToken: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                'auth.accessSecret': 'access-secret',
                'auth.accessExpiresIn': '15m',
                'auth.refreshSecret': 'refresh-secret',
                'auth.refreshExpiresIn': '7d',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    usersService = moduleRef.get(UsersService);
    prisma = moduleRef.get(PrismaService);
  });

  describe('register', () => {
    it('throws ConflictException if email is already taken', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(
        service.register(
          { email: mockUser.email, password: 'StrongPass1', firstName: 'A', lastName: 'B' },
          {},
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a user and returns a token pair', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser as any);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register(
        { email: mockUser.email, password: 'StrongPass1', firstName: 'A', lastName: 'B' },
        {},
      );

      expect(result.user).toEqual(mockUser);
      expect(result.tokens.accessToken).toBe('signed.jwt.token');
      expect(result.tokens.refreshToken).toBe('signed.jwt.token');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'nope@example.com', password: 'x' }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for wrong password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);

      await expect(
        service.login({ email: mockUser.email, password: 'WrongPass1' }, {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens for valid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: mockUser.email, password: 'StrongPass1' }, {});

      expect(result.tokens.accessToken).toBe('signed.jwt.token');
    });
  });
});
