import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'User registration successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      statusCode: HttpStatus.OK,
      message: 'User authentication successful',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    const result = await this.authService.refreshToken(refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      statusCode: HttpStatus.OK,
      message: 'Access token refreshed successfully',
      data: {
        accessToken: result.accessToken,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return {
      statusCode: HttpStatus.OK,
      message: 'User logout successful',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: Request) {
    return {
      statusCode: HttpStatus.OK,
      message: 'User profile fetched successfully',
      data: {
        user: req['user'],
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Req() req: Request,
    @Body() body: { fullName?: string; bio?: string; location?: string; avatarUrl?: string },
  ) {
    const userId = (req as any).user.id;
    const updatedUser = await this.authService.updateProfile(userId, body);
    return {
      statusCode: HttpStatus.OK,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @Req() req: Request,
    @Body() body: { preferences: string[] },
  ) {
    const userId = (req as any).user.id;
    const updatedUser = await this.authService.updatePreferences(userId, body.preferences || []);
    return {
      statusCode: HttpStatus.OK,
      message: 'Travel preferences updated successfully',
      data: {
        user: updatedUser,
      },
    };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
