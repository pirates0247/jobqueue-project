import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as publicly accessible, bypassing JwtAuthGuard.
 * Usage: @Public() above a controller method (e.g. login, register).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
