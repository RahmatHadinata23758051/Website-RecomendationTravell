import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { ActivityService } from '../activity/activity.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;
  private readonly refreshTokenTtlSeconds = 7 * 24 * 60 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly activityService: ActivityService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Hash a token using SHA-256 for secure Redis key storage.
   * This ensures raw JWT tokens are never visible in Redis MONITOR, key dumps, or logs.
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Blacklists a token by storing its SHA-256 hash in Redis.
   */
  async blacklistToken(token: string, ttlSeconds: number = this.refreshTokenTtlSeconds): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.redisService.set(
      `blacklist:token:${tokenHash}`,
      'revoked',
      ttlSeconds,
    );
  }

  /**
   * Checks whether a token is blacklisted by checking its SHA-256 hash in Redis.
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const result = await this.redisService.get(
      `blacklist:token:${tokenHash}`,
    );
    return Boolean(result);
  }


  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email address is already registered');
    }

    try {
      const passwordHash = await bcrypt.hash(registerDto.password, this.saltRounds);

      const user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          passwordHash: passwordHash,
          fullName: registerDto.fullName,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          bio: true,
          location: true,
          preferences: true,
          xp: true,
          role: true,
          createdAt: true,
        },
      });

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Registration failed due to a server error');
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        location: user.location,
        preferences: user.preferences,
        xp: user.xp,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async updateProfile(
    userId: string,
    updateDto: { fullName?: string; bio?: string; location?: string; avatarUrl?: string },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateDto.fullName && { fullName: updateDto.fullName }),
        ...(updateDto.bio !== undefined && { bio: updateDto.bio }),
        ...(updateDto.location !== undefined && { location: updateDto.location }),
        ...(updateDto.avatarUrl !== undefined && { avatarUrl: updateDto.avatarUrl }),
        xp: { increment: 20 }, // Award +20 XP for editing profile
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        location: true,
        preferences: true,
        xp: true,
        role: true,
        createdAt: true,
      },
    });

    await this.activityService.logActivity(
      userId,
      'UPDATE_PROFILE',
      'Memperbarui Foto & Biodata Profil',
      'Mendapatkan +20 XP',
      'user',
    );

    return user;
  }

  async updatePreferences(userId: string, preferences: string[]) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { preferences },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        location: true,
        preferences: true,
        xp: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async addXp(userId: string, amount: number) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        xp: {
          increment: amount,
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        location: true,
        preferences: true,
        xp: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async logout(refreshTokenString?: string): Promise<void> {
    if (refreshTokenString) {
      await this.blacklistToken(refreshTokenString);
    }
  }

  async refreshToken(refreshTokenString: string) {
    if (!refreshTokenString) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const isBlacklisted = await this.isTokenBlacklisted(refreshTokenString);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    try {
      const payload = await this.jwtService.verifyAsync(refreshTokenString, {
        secret: this.getJwtSecret('JWT_REFRESH_SECRET', 'super-secret-refresh-key-lampung-2026'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      // Invalidate old token to prevent token reuse
      await this.blacklistToken(refreshTokenString);

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessSecret = this.getJwtSecret(
      'JWT_ACCESS_SECRET',
      'super-secret-access-key-lampung-2026',
    );
    const refreshSecret = this.getJwtSecret(
      'JWT_REFRESH_SECRET',
      'super-secret-refresh-key-lampung-2026',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private getJwtSecret(key: string, fallback: string): string {
    const value = this.configService.get<string>(key);
    if (!value && process.env.NODE_ENV === 'production') {
      throw new InternalServerErrorException(
        `${key} must be explicitly configured in production`,
      );
    }
    return value || fallback;
  }
}
