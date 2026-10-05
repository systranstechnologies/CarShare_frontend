import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MultiStopRideService } from '../services/multi-stop-ride.service';
import { MockDataService, LocationItem } from '../mock-data.service';
import { ToastService } from '../toast.service';
import { AuthService } from '../auth.service';
import { DiditVerificationService } from '../services/didit-verification.service';
import { getVerificationUIState, normalizeVerificationStatus, VerificationStatus } from '../services/verification-state';
import { RideSearchRequest, RideSearchResult } from '../models/multi-stop-ride.model';
import { LocationService } from '../services/location.service';
import { GeoLocation } from '../models/geo-location.model';
import { Subscription } from 'rxjs';

/**
 * Component for searching multi-stop rides.
 * 
 * Features:
 * - Search by from/to locations and date
 * - Filter by seat count
 * - Display matching rides with detailed information
 * - Show route preview and segment details
 * - Book ride segments
 */
@Component({
  selector: 'app-multi-stop-ride-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-shell">
      <div class="page-header">
        <div>
          <h1 class="page-title">Find your ride</h1>
          <p class="page-sub">Search a journey between any two stops and book only that segment.</p>
        </div>
      </div>

      <section *ngIf="!verificationState.isApproved" class="card">
        <h3>Verify identity before booking</h3>
        <p>{{ verificationMessage }}</p>
        <button *ngIf="verificationState.canStart || verificationState.showRetry" class="btn btn-primary" type="button" (click)="startVerification()" [disabled]="verificationLoading">
          {{ verificationState.showRetry ? 'Retry Verification' : 'Verify Identity' }}
        </button>
        <button *ngIf="verificationState.showRefresh" class="btn btn-secondary" type="button" (click)="refreshVerificationStatus()" [disabled]="verificationLoading">Refresh Status</button>
      </section>

      <!-- Search Form -->
      <section class="card search-card">
        <h3>🔍 Find Multi-Stop Rides</h3>
        
        <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="search-form">
          <div class="field">
            <label>From Location</label>
            <div class="location-autocomplete">
              <input type="text" formControlName="fromLocation" placeholder="Type starting stop" required
                (input)="onLocationInput('from', $any($event.target).value)" (focus)="onLocationFocus('from')" autocomplete="off" />
              <div class="location-suggestions" *ngIf="activeLocationField === 'from' && fromLocationSuggestions.length">
                <button type="button" *ngFor="let location of fromLocationSuggestions" (mousedown)="selectLocation('from', location)">
                  {{ location.displayName || location.district }} <span>India</span>
                </button>
              </div>
            </div>
          </div>
          <div class="field">
            <label>To Location</label>
            <div class="location-autocomplete">
              <input type="text" formControlName="toLocation" placeholder="Type destination stop" required
                (input)="onLocationInput('to', $any($event.target).value)" (focus)="onLocationFocus('to')" autocomplete="off" />
              <div class="location-suggestions" *ngIf="activeLocationField === 'to' && toLocationSuggestions.length">
                <button type="button" *ngFor="let location of toLocationSuggestions" (mousedown)="selectLocation('to', location)">
                  {{ location.displayName || location.district }} <span>India</span>
                </button>
              </div>
            </div>
          </div>
          <div class="field">
            <label>Date</label>
            <input type="date" formControlName="date" [min]="today" required />
          </div>
          <div class="field">
            <label>Passengers</label>
            <select formControlName="seats" required>
              <option value="">Select seats</option>
              <option *ngFor="let i of [1,2,3,4,5,6]" [value]="i">{{ i }} {{ i === 1 ? 'Seat' : 'Seats' }}</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary search-button" [disabled]="!searchForm.valid || isLoading">
            {{ isLoading ? 'Searching...' : 'Search' }}
          </button>
        </form>

        <!-- Error Display -->
        <div *ngIf="errorMessage" class="alert alert-danger">
          {{ errorMessage }}
        </div>
      </section>

      <!-- Search Results -->
      <div *ngIf="searchResults && !isLoading" class="results-section">
        <div class="results-heading">
          <h3>Available rides ({{ searchResults.items.length }})</h3>
          <button type="button" class="btn btn-secondary btn-sm" (click)="searchResults = null">New search</button>
        </div>

        <!-- Results List -->
        <div class="rides-list">
          <div *ngFor="let ride of searchResults.items" class="ride-card">
            <!-- Ride Header -->
            <div class="ride-header">
              <div class="ride-main">
                <div class="route-info">
                  <div class="location from">{{ ride.fromLocation }}</div>
                  <div class="arrow">→</div>
                  <div class="location to">{{ ride.toLocation }}</div>
                </div>
                <div class="time-info">
                  <span class="time">{{ formatTime(ride.departureTime) }}</span>
                  <span class="duration">{{ ride.travelDuration }}</span>
                  <span class="time">{{ formatTime(ride.arrivalTime) }}</span>
                </div>
              </div>
              <div class="ride-price">
                <div class="price-pill">₹{{ ride.price }}</div>
              </div>
            </div>

            <!-- Ride Details -->
            <div class="ride-details">
              <div class="detail-row">
                <div class="detail">
                  <span class="label">Driver</span>
                  <span class="value">
                    {{ ride.driverName }}
                  </span>
                  <span class="rating" *ngIf="ride.driverAverageRating > 0">
                    ⭐ {{ ride.driverAverageRating }} ({{ ride.driverRatingsCount }})
                  </span>
                </div>
                <div class="detail">
                  <span class="label">Vehicle</span>
                  <span class="value">{{ ride.vehicleModel || 'Not specified' }}</span>
                </div>
                <div class="detail">
                  <span class="label">Seats</span>
                  <span class="value">
                    {{ ride.availableSeats }}/{{ ride.totalSeats }}
                    <span *ngIf="ride.femaleOnly" class="badge badge-female">F Only</span>
                  </span>
                </div>
              </div>

              <!-- Full Route Preview -->
              <div class="route-preview">
                <div class="route-title">📍 Route:</div>
                <div class="route-path">{{ ride.routePreview }}</div>
                <div class="route-stops">
                  <div *ngFor="let stop of ride.routeStops" class="stop-item" 
                       [class.active]="stop.isFromStop || stop.isToStop">
                    <div class="stop-marker" [class.from]="stop.isFromStop" [class.to]="stop.isToStop">
                      {{ stop.stopOrder }}
                    </div>
                    <div class="stop-info">
                      <div class="stop-name">{{ stop.locationName }}</div>
                      <div class="stop-times" *ngIf="stop.arrivalTime || stop.departureTime">
                        <span *ngIf="stop.arrivalTime">{{ formatTime(stop.arrivalTime) }}</span>
                        <span *ngIf="stop.departureTime">{{ formatTime(stop.departureTime) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Button -->
            <div class="ride-footer">
              <button *ngIf="canBook(ride)" class="btn btn-primary" (click)="bookRide(ride)">View / Book</button>
              <span *ngIf="!canBook(ride)" class="full-status" aria-label="Requested seats are unavailable">FULL</span>
              <span *ngIf="ride.availableSeats > 0 && !canBook(ride)" class="full-status availability-status">
                Only {{ ride.availableSeats }} seat(s) available
              </span>
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div *ngIf="searchResults.items.length === 0" class="no-results">
          <p>No rides found for your search. Try different dates or locations.</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Searching for available rides...</p>
      </div>

      <!-- Initial State -->
      <div *ngIf="!searchResults && !isLoading && !errorMessage" class="initial-state">
        <p>Fill in the search form above and click "Search" to find available rides.</p>
      </div>
    </div>
  `,
  styles: [`
    /* Mobile-First Responsive Design */
    * {
      box-sizing: border-box;
    }

    .page-shell {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
    }

    .card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      margin-bottom: 16px;
    }

    h2 {
      color: #333;
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 700;
    }

    h3 {
      color: #1f2937;
      margin: 0 0 14px 0;
      font-size: 16px;
    }

    .search-form {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      align-items: end;
    }

    .form-row {
      display: contents;
    }

    .field {
      display: flex;
      flex-direction: column;
    }

    .field label {
      font-weight: 600;
      margin-bottom: 6px;
      color: #333;
      font-size: 13px;
    }

    .field input,
    .field select {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      line-height: 1.5;
    }

    .field input:focus,
    .field select:focus {
      outline: none;
      border-color: #464feb;
      box-shadow: 0 0 0 3px rgba(70, 79, 235, 0.1);
    }

    .location-autocomplete { position: relative; }
    .location-suggestions {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 20;
      max-height: 220px;
      overflow-y: auto;
      background: #fff;
      border: 1px solid #dbe3ef;
      border-radius: 6px;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.14);
    }
    .location-suggestions button {
      display: flex;
      width: 100%;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border: 0;
      border-bottom: 1px solid #eef2f7;
      background: #fff;
      color: #1f2937;
      text-align: left;
      cursor: pointer;
    }
    .location-suggestions button:hover { background: #f4f7ff; }
    .location-suggestions span { color: #64748b; font-size: 12px; }

    .btn {
      padding: 12px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: #464feb;
      color: white;
    }

    .btn-secondary {
      background: #eef2f7;
      color: #334155;
    }

    .btn-sm {
      padding: 8px 12px;
      font-size: 12px;
    }

    .search-button {
      width: 100%;
    }

    .btn-primary:active:not(:disabled) {
      background: #3d42c7;
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn-full {
      width: 100%;
    }

    .alert {
      padding: 12px;
      border-radius: 4px;
      margin-top: 12px;
      font-size: 13px;
    }

    .alert-danger {
      background: #ffe6e6;
      border: 1px solid #ffcccc;
      color: #dc3545;
    }

    .results-section {
      margin-top: 20px;
    }

    .results-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .results-heading h3 {
      margin: 0;
      color: #374151;
    }

    .rides-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .ride-card {
      display: block;
      width: 100%;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      background: white;
      transition: box-shadow 0.3s ease;
    }

    .ride-card:active {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .ride-header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 12px;
      background: #fff;
      border-bottom: 1px solid #e6e6e6;
      gap: 12px;
    }

    .ride-main {
      flex: 1;
      min-width: 0;
    }

    .route-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .location {
      font-weight: 600;
      font-size: 14px;
      color: #333;
    }

    .location.from {
      color: #4caf50;
    }

    .location.to {
      color: #f44336;
    }

    .arrow {
      color: #464feb;
      font-size: 16px;
    }

    .time-info {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 12px;
      color: #666;
      flex-wrap: wrap;
    }

    .time {
      font-weight: 600;
      color: #333;
    }

    .duration {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
    }

    .ride-price {
      text-align: right;
      flex-shrink: 0;
    }

    .price {
      font-size: 18px;
      font-weight: 700;
      color: #464feb;
    }

    .price-pill {
      display: inline-block;
      padding: 7px 11px;
      border-radius: 999px;
      background: #6366d9;
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      white-space: nowrap;
    }

    .ride-details {
      width: 100%;
      padding: 12px;
    }

    .detail-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }

    .detail {
      display: flex;
      flex-direction: column;
    }

    .detail .label {
      font-weight: 600;
      color: #666;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail .value {
      color: #333;
      font-size: 13px;
      font-weight: 500;
    }

    .rating {
      display: block;
      margin-top: 2px;
      color: #666;
      font-size: 12px;
      font-weight: 400;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      margin-left: 6px;
    }

    .badge-female {
      background: #ffe6f0;
      color: #c2185b;
    }

    .route-preview {
      width: 100%;
      overflow: hidden;
      background: #f9f9f9;
      padding: 12px;
      border-radius: 4px;
      margin-top: 12px;
      font-size: 13px;
    }

    .route-title {
      font-weight: 600;
      margin-bottom: 8px;
      color: #333;
    }

    .route-path {
      color: #666;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #ddd;
      font-size: 12px;
      word-break: break-word;
    }

    .route-stops {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stop-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }

    .stop-item.active {
      background: #f0f7ff;
      padding: 8px;
      border-radius: 4px;
      border-left: 3px solid #464feb;
    }

    .stop-marker {
      min-width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #e6e6e6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 11px;
      color: #666;
      flex-shrink: 0;
    }

    .stop-marker.from {
      background: #4caf50;
      color: white;
    }

    .stop-marker.to {
      background: #f44336;
      color: white;
    }

    .stop-info {
      flex: 1;
      min-width: 0;
    }

    .stop-name {
      font-weight: 600;
      color: #333;
      font-size: 13px;
    }

    .stop-times {
      display: flex;
      gap: 8px;
      font-size: 11px;
      color: #666;
      margin-top: 3px;
      flex-wrap: wrap;
    }

    .ride-footer {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      padding: 12px;
      background: #fff;
      border-top: 1px solid #e6e6e6;
    }

    .no-results {
      text-align: center;
      padding: 30px 16px;
      color: #666;
    }

    .loading {
      text-align: center;
      padding: 30px 16px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #f0f0f0;
      border-top: 3px solid #464feb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading p {
      color: #666;
      font-size: 14px;
    }

    .initial-state {
      text-align: center;
      padding: 30px 16px;
      color: #666;
      font-size: 14px;
    }

    /* Tablet (600px and up) */
    @media (min-width: 600px) {
      .page-shell {
        padding: 12px;
      }

      .card {
        padding: 20px;
      }

      h2 {
        font-size: 24px;
      }

      h3 {
        font-size: 18px;
      }

      .search-form {
        gap: 16px;
      }

      .ride-header {
        padding: 16px;
        gap: 16px;
      }

      .ride-details {
        padding: 16px;
      }

      .detail-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .route-preview {
        padding: 16px;
      }

      .ride-footer {
        padding: 16px;
      }

      .price {
        font-size: 20px;
      }

      .location {
        font-size: 16px;
      }

      .time-info {
        font-size: 14px;
      }
    }

    /* Desktop (1024px and up) */
    @media (min-width: 1024px) {
      .page-shell {
        padding: 16px;
      }

      .card {
        padding: 24px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
      }

      .detail-row {
        grid-template-columns: repeat(3, 1fr);
      }

      .ride-card:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }

      .btn:hover:not(:disabled) {
        box-shadow: 0 4px 12px rgba(70, 79, 235, 0.2);
        transform: translateY(-2px);
      }

      .ride-card:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }

      .price {
        font-size: 24px;
      }
    }

    @media (max-width: 760px) {
      .page-shell {
        padding: 10px;
      }

      .search-form {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .search-button {
        grid-column: span 2;
      }
    }

    @media (max-width: 480px) {
      .search-form {
        grid-template-columns: 1fr;
      }

      .search-button {
        grid-column: auto;
      }

      .results-heading {
        align-items: flex-start;
        flex-direction: column;
      }

      .ride-header {
        flex-direction: column;
      }

      .ride-price {
        width: 100%;
        text-align: left;
      }

      .ride-footer .btn {
        width: 100%;
      }
    }
  `]
})
export class MultiStopRideSearchComponent implements OnInit {

  searchForm!: FormGroup;
  searchResults: any = null;
  today = this.localDateKey();
  isLoading = false;
  errorMessage = '';
  allLocations: LocationItem[] = [];
  fromLocationSuggestions: LocationItem[] = [];
  toLocationSuggestions: LocationItem[] = [];
  activeLocationField: 'from' | 'to' | null = null;
  verificationStatus: VerificationStatus = 'NOT_STARTED';
  verificationLoading = false;
  private locationSearchTimers: Partial<Record<'from' | 'to', ReturnType<typeof setTimeout>>> = {};
  private locationSearchSubscriptions: Partial<Record<'from' | 'to', Subscription>> = {};
  private locationSearchVersions: Record<'from' | 'to', number> = { from: 0, to: 0 };

  constructor(
    private fb: FormBuilder,
    private rideService: MultiStopRideService,
    private rideLocations: MockDataService,
    private router: Router,
    private toast: ToastService,
    private auth: AuthService,
    private didit: DiditVerificationService,
    private locationService: LocationService
  ) {}

  get verificationState() { return getVerificationUIState(this.verificationStatus); }
  get verificationMessage() {
    return this.verificationState.showProgress ? 'Your identity verification is under review. You can browse rides now and book after approval.' : this.verificationState.showRetry ? 'Identity verification was rejected. Retry it before booking a ride.' : 'You can browse rides now. Complete identity verification before requesting a booking.';
  }

  ngOnInit() {
    this.initForm();
    this.refreshVerificationStatus();
    this.loadLocations();
  }

  startVerification() {
    this.verificationLoading = true;
    this.didit.createSession('PASSENGER').subscribe({
      next: ({ verificationUrl, status }) => { this.verificationStatus = normalizeVerificationStatus(status); this.verificationLoading = false; void this.didit.openVerification(verificationUrl); },
      error: () => { this.verificationLoading = false; this.toast.show('Unable to start identity verification', 'error'); }
    });
  }

  refreshVerificationStatus() {
    if (!this.auth.current) return;
    this.verificationLoading = true;
    this.didit.getStatus().subscribe({
      next: result => { this.verificationStatus = result.status; this.verificationLoading = false; },
      error: () => { this.verificationLoading = false; }
    });
  }

  private loadLocations() {
    this.allLocations = [];
  }

  private uniqueLocations(locations: LocationItem[]): LocationItem[] {
    const seen = new Set<string>();
    return (locations || []).filter(location => {
      const key = location.district.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.district.localeCompare(b.district));
  }

  filterLocations(field: 'from' | 'to', value: string) {
    this.activeLocationField = field;
    const version = ++this.locationSearchVersions[field];
    if (this.locationSearchTimers[field]) clearTimeout(this.locationSearchTimers[field]);
    this.locationSearchSubscriptions[field]?.unsubscribe();
    const query = String(value || '').trim().toLowerCase();
    const oppositeField = field === 'from' ? 'toLocation' : 'fromLocation';
    const oppositeValue = String(this.searchForm.get(oppositeField)?.value || '').trim().toLowerCase();
    if (query.length < 2) {
      if (field === 'from') this.fromLocationSuggestions = [];
      else this.toLocationSuggestions = [];
      return;
    }
    this.locationSearchTimers[field] = setTimeout(() => {
      this.locationSearchSubscriptions[field] = this.locationService.search(query).subscribe({
        next: locations => {
          if (version !== this.locationSearchVersions[field]) return;
          const suggestions = locations.map(location => this.toLocationItem(location))
            .filter(location => location.district.trim().toLowerCase() !== oppositeValue);
          if (field === 'from') this.fromLocationSuggestions = suggestions;
          else this.toLocationSuggestions = suggestions;
        },
        error: () => {
          if (version !== this.locationSearchVersions[field]) return;
          if (field === 'from') this.fromLocationSuggestions = [];
          else this.toLocationSuggestions = [];
        }
      });
    }, 300);
  }

  onLocationInput(field: 'from' | 'to', value: string) {
    const prefix = field === 'from' ? 'from' : 'to';
    this.searchForm.patchValue({ [`${prefix}Latitude`]: null, [`${prefix}Longitude`]: null }, { emitEvent: false });
    this.filterLocations(field, value);
  }

  onLocationFocus(field: 'from' | 'to') {
    this.activeLocationField = field;
    const suggestions = field === 'from' ? this.fromLocationSuggestions : this.toLocationSuggestions;
    if (!suggestions.length) this.filterLocations(field, this.searchForm.get(`${field}Location`)?.value || '');
  }

  selectLocation(field: 'from' | 'to', location: LocationItem) {
    this.locationSearchVersions[field]++;
    if (this.locationSearchTimers[field]) clearTimeout(this.locationSearchTimers[field]);
    this.locationSearchSubscriptions[field]?.unsubscribe();
    const prefix = field === 'from' ? 'from' : 'to';
    this.searchForm.patchValue({
      [`${prefix}Location`]: location.displayName || location.district,
      [`${prefix}Latitude`]: location.latitude,
      [`${prefix}Longitude`]: location.longitude
    });
    this.activeLocationField = null;
  }

  private toLocationItem(location: GeoLocation): LocationItem {
    return {
      id: location.id || location.osmId || '',
      state: location.state || '',
      district: location.city || location.displayName,
      displayName: location.displayName,
      city: location.city,
      locality: location.locality,
      street: location.street,
      latitude: location.latitude,
      longitude: location.longitude,
      geofenceRadius: location.geofenceRadius,
      osmId: location.osmId
    };
  }

  /**
   * Initialize search form.
   */
  private initForm() {
    this.searchForm = this.fb.group({
      fromLocation: ['', Validators.required],
      toLocation: ['', Validators.required],
      fromLatitude: [null, Validators.required],
      fromLongitude: [null, Validators.required],
      toLatitude: [null, Validators.required],
      toLongitude: [null, Validators.required],
      date: ['', Validators.required],
      seats: ['', Validators.required]
    });
  }

  /**
   * Perform search.
   */
  onSearch() {
    if (!this.searchForm.valid) {
      this.errorMessage = 'Please fill all fields';
      return;
    }
    if (!["fromLatitude", "fromLongitude", "toLatitude", "toLongitude"].every(field => this.hasCoordinate(this.searchForm.get(field)?.value))) {
      this.errorMessage = 'Select both locations from the dropdown suggestions.';
      return;
    }

    const fromLocation = String(this.searchForm.get('fromLocation')?.value || '').trim();
    const toLocation = String(this.searchForm.get('toLocation')?.value || '').trim();
    const requestedDate = String(this.searchForm.get('date')?.value || '');
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (requestedDate < todayKey) {
      this.errorMessage = 'Only today or future dates are available';
      return;
    }
    if (fromLocation.toLowerCase() === toLocation.toLowerCase()) {
      this.errorMessage = 'From and To locations must be different';
      return;
    }

    this.isLoading = true;
    this.activeLocationField = null;
    this.errorMessage = '';
    this.searchResults = null;

    const request: RideSearchRequest = {
      fromLocation,
      toLocation,
      fromLatitude: Number(this.searchForm.get('fromLatitude')?.value),
      fromLongitude: Number(this.searchForm.get('fromLongitude')?.value),
      toLatitude: Number(this.searchForm.get('toLatitude')?.value),
      toLongitude: Number(this.searchForm.get('toLongitude')?.value),
      date: requestedDate,
      seats: parseInt(this.searchForm.get('seats')?.value, 10),
      includeFull: true
    };

    this.rideService.searchRidesPost(request).subscribe({
      next: (results) => {
        this.isLoading = false;
        const currentUser = this.auth.current;
        this.searchResults = {
          ...results,
          items: results.items.filter(ride =>
            ride.driverId !== currentUser?.id
            && (!ride.femaleOnly || currentUser?.gender?.toLowerCase() === 'female')
          )
        };
        if (this.searchResults.items.length === 0) {
          this.toast.show('No rides found for your search', 'info');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Search failed';
        this.toast.show(this.errorMessage, 'error');
      }
    });
  }

  private hasCoordinate(value: unknown): boolean {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  }

  /**
   * Format time for display.
   */
  formatTime(timeStr: string): string {
    return this.rideService.formatTime(timeStr);
  }

  canBook(ride: RideSearchResult): boolean {
    const requestedSeats = Number(this.searchForm.get('seats')?.value || 0);
    return ride.driverId !== this.auth.current?.id && Number(ride.availableSeats || 0) >= requestedSeats;
  }

  private localDateKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * Book ride.
   */
  bookRide(ride: RideSearchResult) {
    if (!this.verificationState.isApproved) {
      this.toast.show('Complete identity verification before requesting a booking.', 'warning');
      return;
    }
    if (!ride.rideId) {
      this.toast.show('Invalid ride selection', 'error');
      return;
    }
    if (ride.driverId === this.auth.current?.id) {
      this.toast.show('You cannot book your own ride.', 'warning');
      return;
    }

    // Navigate to booking page with ride details
    this.router.navigate(['/rides/book/multi-stop'], {
      queryParams: {
        rideId: ride.rideId,
        fromLocation: ride.fromLocation,
        toLocation: ride.toLocation,
        driverName: ride.driverName,
        price: ride.price,
        availableSeats: ride.availableSeats,
        seats: this.searchForm.get('seats')?.value
      }
    });
  }
}
