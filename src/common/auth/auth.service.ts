import { Injectable, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtSecret } from './secret/jwt.secret';

type JwtExpiresIn = `${number}s` | `${number}m` | `${number}h` | `${number}d`;

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async getAccessTokens(userId: string, accessTime: JwtExpiresIn = '15m') {
    const token = this.jwtService.sign(
      { userId },
      {
        secret: jwtSecret.accessSecret,
        expiresIn: accessTime,
      },
    );
    return { token };
  }

  async getRefreshTokens(userId: string, refreshTime: JwtExpiresIn = '7d') {
    const refToken = this.jwtService.sign(
      { userId },
      {
        secret: jwtSecret.refreshSecret,
        expiresIn: refreshTime,
      },
    );
    return { refToken };
  }

  async Generate(userId) {
    return {
      ...(await this.getAccessTokens(userId)),
      ...(await this.getRefreshTokens(userId)),
    };
  }
}

