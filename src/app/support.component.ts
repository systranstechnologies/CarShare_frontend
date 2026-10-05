import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MockDataService } from './mock-data.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="support-page">
      <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-ghost btn-sm" (click)="goBack()">← Back</button>
          <div>
            <h1>Support</h1>
            <p class="muted-small">Raise tickets and view your existing issues.</p>
          </div>
        </div>
        <div>
          <button *ngIf="auth.current?.role !== 'admin'" class="btn btn-primary" (click)="openForm = true">Raise ticket</button>
        </div>
      </header>

      <section *ngIf="openForm" class="card" style="padding:18px;margin-bottom:18px">
        <h3>Raise ticket</h3>
        <div style="display:grid;gap:8px;max-width:720px">
          <label>Category
            <select [(ngModel)]="form.category">
              <option *ngFor="let c of categories" [value]="c.code">{{c.label}}</option>
            </select>
          </label>
          <label>Description
            <textarea [(ngModel)]="form.description" rows="4" [placeholder]="descriptionPlaceholder"></textarea>
          </label>
          <label>Image (optional)
            <input type="file" (change)="onFile($event)" accept="image/*" />
          </label>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" (click)="submit()">Submit</button>
            <button class="btn btn-ghost" (click)="openForm=false">Cancel</button>
          </div>
        </div>
      </section>

      <section class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h2>Your tickets</h2>
          <div class="muted-small">{{ tickets.length }} records</div>
        </div>
        <div *ngIf="!tickets.length" class="empty">No tickets</div>
        <div *ngFor="let t of tickets" style="border-bottom:1px solid #eee;padding:12px 0">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <strong>#{{t.id}} - {{t.categoryLabel || t.category}}</strong>
              <div class="muted-small">{{t.createdAt | date:'short'}} · <span [class]="'status-' + t.status">{{t.status}}</span></div>
              <div style="margin-top:6px">{{t.description}}</div>
              <div *ngIf="t.resolution" style="margin-top:8px"><strong>Remarks:</strong> {{t.resolution}}</div>
            </div>
            <div style="text-align:right">
              <button class="btn btn-ghost" (click)="view(t)">View</button>
            </div>
          </div>
        </div>
      </section>

      <section *ngIf="selected" class="card" style="margin-top:12px;padding:16px">
        <h3>Ticket #{{selected.id}}</h3>
        <div class="muted-small">Category: {{selected.categoryLabel || selected.category}} · Status: {{selected.status}}</div>
        <p style="margin-top:10px">{{selected.description}}</p>
        <div *ngIf="selected.imageUrl"><img [src]="selected.imageUrl" style="max-width:240px;border-radius:8px" /></div>
        <p *ngIf="selected.resolution" style="margin-top:12px"><strong>Admin response:</strong> {{selected.resolution}}</p>
        <div style="text-align:right;margin-top:12px"><button class="btn" (click)="selected=undefined">Close</button></div>
      </section>
    </main>
  `
})
export class SupportComponent {
  tickets: any[] = [];
  categories: any[] = [];
  openForm = false;
  selected: any | undefined;
  form: any = { category: '', description: '', image: undefined };
  descriptionPlaceholder = 'Describe the issue';

  constructor(private data: MockDataService, public auth: AuthService, private toast: ToastService, private location: Location, private route: ActivatedRoute) {
    this.loadCategories();
    this.loadTickets();
    this.prefillSafetyReport();
  }

  private prefillSafetyReport() {
    if (this.route.snapshot.queryParamMap.get('safety') !== '1') return;
    const rideId = this.route.snapshot.queryParamMap.get('rideId') || 'the current ride';
    const owner = this.route.snapshot.queryParamMap.get('owner') || 'the ride owner';
    this.openForm = true;
    this.descriptionPlaceholder = `Safety concern for ${rideId} involving ${owner}. Describe what happened, where you are, and whether immediate help is needed.`;
  }

  goBack() {
    try { this.location.back(); } catch (e) { window.history.back(); }
  }

  loadCategories() {
    this.data.getTicketCategories().subscribe({ next: rows => {
      const all = rows || [];
      const role = this.auth.current?.role || '';
      if (role === 'owner') {
        this.categories = all.filter((c: any) => !c.forRole || c.forRole === 'ALL' || c.forRole === 'OWNER');
      } else if (role === 'passenger') {
        this.categories = all.filter((c: any) => !c.forRole || c.forRole === 'ALL' || c.forRole === 'PASSENGER');
      } else {
        // admin or unknown: show all but don't allow raising (raise button hidden)
        this.categories = all;
      }
      if (this.categories.length) this.form.category = this.categories[0].code;
      if (this.route.snapshot.queryParamMap.get('safety') === '1') {
        const safetyCategory = this.categories.find((category: any) => /safety|emergency|incident/i.test(`${category.code} ${category.label}`));
        if (safetyCategory) this.form.category = safetyCategory.code;
      }
    }, error: () => this.toast.show('Unable to load categories', 'error') });
  }

  loadTickets() {
    this.data.getMyTickets().subscribe({ next: rows => { this.tickets = rows || []; }, error: () => this.toast.show('Unable to load tickets', 'error') });
  }

  onFile(ev: any) {
    const f = ev.target.files && ev.target.files[0];
    if (f) this.form.image = f;
  }

  submit() {
    if (!this.form.category) { this.toast.show('Select category', 'warning'); return; }
    if (!this.form.description || !this.form.description.trim()) { this.toast.show('Enter description', 'warning'); return; }
    const fd = new FormData();
    fd.append('category', this.form.category);
    fd.append('description', this.form.description);
    if (this.form.image) fd.append('image', this.form.image);
    this.data.createTicket(fd).subscribe({ next: () => { this.toast.show('Ticket submitted', 'success'); this.openForm = false; this.form = { category: this.form.category, description: '', image: undefined }; this.loadTickets(); }, error: () => this.toast.show('Unable to submit ticket', 'error') });
  }

  view(t: any) { this.selected = t; }
}
