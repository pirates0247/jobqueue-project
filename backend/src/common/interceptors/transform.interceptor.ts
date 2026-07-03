import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto, PaginatedResponseDto } from '../dto/api-response.dto';

/**
 * Wraps all successful controller responses in a consistent envelope:
 * { success, data, timestamp, path }.
 * If the handler already returns a PaginatedResponseDto, it is passed through untouched.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        if (data instanceof PaginatedResponseDto) {
          return data;
        }
        return new ApiResponseDto(data, request.url);
      }),
    );
  }
}
