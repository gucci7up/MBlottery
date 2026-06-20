import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

interface JwtPayload {
  sub: string;
  jwtId: string;
  operatorId: string;
  branchId: string | null;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }

  async validate(payload: JwtPayload) {
    const blacklisted = await this.authService.isTokenBlacklisted(payload.jwtId);
    if (blacklisted) throw new UnauthorizedException('Token revocado');

    return {
      id: payload.sub,
      jwtId: payload.jwtId,
      operatorId: payload.operatorId,
      branchId: payload.branchId,
      role: payload.role,
    };
  }
}
