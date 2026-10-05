import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { GeoLocation, GeoLocationSearchResponse } from '../models/geo-location.model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly apiUrl = `${environment.apiBaseUrl}/locations`;
  private readonly cache = new Map<string, GeoLocation[]>();

  constructor(private http: HttpClient) {}

  search(query: string, state?: string): Observable<GeoLocation[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) return of([]);

    const cacheKey = `${normalizedQuery}|${(state || '').trim().toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    let params = new HttpParams().set('query', normalizedQuery);
    if (state?.trim()) params = params.set('state', state.trim());

    return this.http.get<GeoLocationSearchResponse | GeoLocation[]>(`${this.apiUrl}/search`, { params }).pipe(
      map((response: any) => Array.isArray(response) ? response : response.data || response.items || []),
      map((items: GeoLocation[]) => items.filter(item =>
        ['india', 'in'].includes((item.country || '').trim().toLowerCase())
        && Number.isFinite(item.latitude)
        && Number.isFinite(item.longitude)
      ).slice(0, 10)),
      map(items => {
        this.cache.set(cacheKey, items);
        return items;
      }),
      catchError(() => this.http.get<any>(this.apiUrl, { params }).pipe(
        map(response => (response.data || []).map((item: any) => this.fromLegacyLocation(item))),
        catchError(() => of([]))
      )),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  typeahead(query$: Observable<string>, state?: string): Observable<GeoLocation[]> {
    return query$.pipe(
      map(value => String(value || '').trim()),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.search(query, state))
    );
  }

  private fromLegacyLocation(item: any): GeoLocation {
    return {
      id: item.id,
      displayName: [item.district, item.state].filter(Boolean).join(', '),
      district: item.district || '',
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      city: item.district,
      state: item.state,
      country: item.country || 'India',
      locationType: 'CITY',
      geofenceRadius: 5000,
      source: 'DATABASE'
    };
  }
}
