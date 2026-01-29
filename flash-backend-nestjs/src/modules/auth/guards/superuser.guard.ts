import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class SuperUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.is_superuser && !user?.is_admin) {
      throw new ForbiddenException('This action requires admin or superuser privileges');
    }

    return true;
  }
}
