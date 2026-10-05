import { CommonModule, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-didit-review-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <div class="review-overlay" *ngIf="review">
      <div class="review-panel">
        <div class="header">
          <div>
            <p class="eyebrow">DIDIT REVIEW</p>
            <h3>{{ review.userName || review.userId || 'Verification review' }}</h3>
          </div>
          <button class="close-btn" type="button" (click)="close.emit()" aria-label="Close verification review" title="Close">×</button>
        </div>

        <div class="grid">
          <div class="card">
            <h4>Identity summary</h4>
            <dl>
              <div><dt>User</dt><dd>{{ review.userName || 'Unknown' }}</dd></div>
              <div><dt>Mobile</dt><dd>{{ review.userMobile || '—' }}</dd></div>
              <div><dt>Role</dt><dd>{{ review.userRole || review.role || '—' }}</dd></div>
              <div><dt>Status</dt><dd>{{ review.status || '—' }}</dd></div>
              <div><dt>Session</dt><dd>{{ review.sessionId || '—' }}</dd></div>
              <div><dt>Created</dt><dd>{{ review.createdAt | date:'medium' }}</dd></div>
            </dl>
          </div>

          <div class="card">
            <h4>Didit payload</h4>
            <pre>{{ review.rawPayloadJson || review.payload || 'No payload available.' }}</pre>
          </div>
        </div>

        <div class="final-decision" *ngIf="isFinalDecision">
          <strong>Decision completed</strong>
          <span>This verification is {{ normalizedStatus.toLowerCase() }} and can no longer be modified.</span>
        </div>

        <div class="decision-box" *ngIf="!isFinalDecision">
          <label for="decisionComment">Review comment</label>
          <textarea id="decisionComment" [(ngModel)]="decisionComment" rows="4" placeholder="Add approval or rejection notes"></textarea>
          <div class="actions">
            <button class="btn btn-danger" type="button" (click)="submitDecision('REJECT')">Reject</button>
            <button class="btn btn-primary" type="button" (click)="submitDecision('APPROVE')">Approve</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .review-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55); display: flex; align-items: flex-start; justify-content: center; z-index: 5000; padding: max(76px, env(safe-area-inset-top)) 20px 20px; }
      .review-panel { width: min(980px, 100%); max-height: calc(100dvh - 96px); overflow: auto; background: #fff; border-radius: 12px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25); padding: 0 22px 22px; }
      .header { position: sticky; top: 0; z-index: 2; display: flex; justify-content: space-between; align-items: start; gap: 16px; margin: 0 -22px 18px; padding: 18px 22px 14px; background: #fff; border-bottom: 1px solid #e2e8f0; }
      .eyebrow { margin: 0 0 6px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.12em; color: #4f46e5; }
      .header h3 { margin: 0; font-size: 1.6rem; }
      .close-btn { flex: 0 0 44px; width: 44px; height: 44px; border: 1px solid #cbd5e1; background: #fff; border-radius: 50%; padding: 0; cursor: pointer; font-size: 1.5rem; line-height: 1; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
      .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; background: #f8fafc; }
      .card h4 { margin: 0 0 12px; }
      dl { margin: 0; display: grid; gap: 10px; }
      dl div { display: grid; grid-template-columns: 120px 1fr; gap: 12px; }
      dt { color: #64748b; font-weight: 700; }
      dd { margin: 0; color: #0f172a; word-break: break-word; }
      pre { margin: 0; max-height: 280px; overflow: auto; background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 10px; font-size: 0.82rem; white-space: pre-wrap; }
      .decision-box { margin-top: 18px; border: 1px solid #dbe4ea; background: #fff; border-radius: 14px; padding: 16px; }
      .final-decision { display:grid; gap:4px; margin-top:18px; padding:14px 16px; border:1px solid #a7d8ca; border-radius:10px; background:#edf8f5; color:#185c50; }
      .decision-box label { display: block; font-weight: 700; margin-bottom: 8px; }
      .decision-box textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; resize: vertical; }
      .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
      .btn { border: 0; border-radius: 10px; padding: 10px 16px; font-weight:700; cursor: pointer; }
      .btn-primary { background: #2563eb; color: #fff; }
      .btn-danger { background: #b91c1c; color: #fff; }
      @media (max-width: 700px) {
        .review-overlay { padding: max(64px, env(safe-area-inset-top)) 8px 8px; }
        .review-panel { max-height: calc(100dvh - 72px); padding: 0 12px 14px; border-radius: 8px; }
        .header { margin: 0 -12px 12px; padding: 12px; align-items:center; }
        .header h3 { font-size:1rem; overflow-wrap:anywhere; }
        .eyebrow { margin-bottom:3px; }
        .grid { grid-template-columns: 1fr; gap:10px; }
        .card { padding:12px; }
        dl div { grid-template-columns:90px minmax(0,1fr); gap:8px; }
        pre { max-height:220px; font-size:.72rem; }
        .decision-box { margin-top:10px; padding:12px; }
        .actions .btn { flex:1; min-height:44px; }
      }
    `
  ]
})
export class DiditReviewDetailComponent {
  @Input() review: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() decision = new EventEmitter<{ action: 'APPROVE' | 'REJECT'; comment: string }>();

  decisionComment = '';

  get normalizedStatus(): string {
    const status = String(this.review?.status || '').toUpperCase();
    if (status === 'VERIFIED') return 'APPROVED';
    if (status === 'DECLINED') return 'REJECTED';
    return status;
  }

  get isFinalDecision(): boolean {
    return this.normalizedStatus === 'APPROVED' || this.normalizedStatus === 'REJECTED';
  }

  submitDecision(action: 'APPROVE' | 'REJECT') {
    if (this.isFinalDecision) return;
    const comment = (this.decisionComment || '').trim() || (action === 'APPROVE' ? 'Approved by admin review.' : 'Rejected by admin review.');
    this.decision.emit({ action, comment });
  }
}
