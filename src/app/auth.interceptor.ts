import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, map, Observable, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../environments/environment';

let refreshRequest$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);

  const http = inject(HttpClient);
  const token = localStorage.getItem('accessToken');
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.url.includes('/auth/')) {
        return throwError(() => error);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('demo_current_user');
        window.dispatchEvent(new CustomEvent('carshare-auth-changed', { detail: { user: null } }));
        window.location.assign(window.location.pathname.startsWith('/Kumaresh') ? '/Kumaresh' : '/');
        return throwError(() => error);
      }

      if (!refreshRequest$) {
        refreshRequest$ = http.post<any>(`${environment.apiBaseUrl}/auth/refresh`, { refreshToken }).pipe(
          map(response => response.data),
          tap(tokens => {
            localStorage.setItem('accessToken', tokens.accessToken);
            if (tokens.refreshToken) localStorage.setItem('refreshToken', tokens.refreshToken);
          }),
          map(tokens => tokens.accessToken as string),
          finalize(() => refreshRequest$ = null),
          shareReplay({ bufferSize: 1, refCount: false })
        );
      }

      return refreshRequest$.pipe(
        switchMap((accessToken) => next(req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }))),
        catchError((refreshError) => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('demo_current_user');
          window.dispatchEvent(new CustomEvent('carshare-auth-changed', { detail: { user: null } }));
          window.location.assign(window.location.pathname.startsWith('/Kumaresh') ? '/Kumaresh' : '/');
          return throwError(() => refreshError);
        })
      );
    })
  );
};