export type GeoLocationType = 'STREET' | 'AREA' | 'LOCALITY' | 'CITY' | 'UNKNOWN';

export interface BoundingBox {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface GeoLocation {
  id?: string;
  osmId?: string;
  displayName: string;
  latitude: number;
  longitude: number;
  boundingBox?: BoundingBox;
  city?: string;
  locality?: string;
  street?: string;
  hierarchy?: string[];
  state?: string;
  country?: string;
  locationType: GeoLocationType;
  geofenceRadius: number;
  district?: string;
  source?: 'DATABASE' | 'NOMINATIM' | 'PHOTON';
}

export interface LocationItem extends GeoLocation {
  district: string;
}

export interface GeoLocationSearchResponse {
  items: GeoLocation[];
  source?: string;
}
