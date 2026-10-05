import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../common/enums/role.enum';
import { UsersService } from '../../users/users.service';
import { AuthUser } from '../decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number; // fecha de emision (segundos), la agrega el JWT automaticamente
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Se consulta la BD para rechazar tokens de usuarios desactivados o eliminados
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuario inactivo o inexistente');
    }
    // Un token emitido antes del ultimo cambio de clave ya no sirve
    if (user.passwordChangedAt && payload.iat !== undefined && payload.iat < Math.floor(Math.floor(user.passwordChangedAt.getTime() / 1000) * 1000 / 1000)) {
      throw new UnauthorizedException('Sesion vencida: la contrasena fue cambiada');
    }
    return { id: payload.sub, email: user.email, role: user.role };
  }
}
