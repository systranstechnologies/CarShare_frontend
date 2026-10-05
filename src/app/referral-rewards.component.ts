import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RewardsService, RewardDashboard } from './services/rewards.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-referral-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="rewards-page">
      <header class="rewards-header">
        <div><p class="eyebrow">REFERRAL & REWARDS</p><h1>Your rewards wallet</h1><p>1 coin equals ₹1. Earn after your referral completes their first ride.</p></div>
        <button class="primary" type="button" (click)="showRedemption = !showRedemption" [disabled]="!dashboard?.availableCoins">Redeem coins</button>
      </header>

      <div *ngIf="loading" class="state">Loading rewards...</div>
      <div *ngIf="error" class="state error">{{ error }} <button type="button" (click)="load()">Retry</button></div>

      <ng-container *ngIf="dashboard as data">
        <section class="balance-band">
          <div><span>Available coins</span><strong>{{ data.availableCoins | number }}</strong><small>₹{{ data.availableCoins | number }} value</small></div>
          <div><span>Lifetime earned</span><strong>{{ data.totalEarnedCoins | number }}</strong></div>
          <div><span>Redeemed</span><strong>{{ data.redeemedCoins | number }}</strong></div>
          <div><span>Pending payout</span><strong>{{ data.redemptionPendingCoins | number }}</strong></div>
        </section>

        <section class="referral-panel">
          <div class="code-block"><span>Your referral code</span><strong>{{ data.referralCode }}</strong></div>
          <div class="link-block"><span>{{ data.referralLink }}</span><button type="button" title="Copy referral link" (click)="copy(data.referralLink, 'Referral link copied')">Copy link</button></div>
          <div class="actions">
            <button type="button" (click)="copy(data.referralCode, 'Referral code copied')">Copy code</button>
            <button type="button" class="primary" (click)="share()">Share referral</button>
          </div>
        </section>

        <section *ngIf="showRedemption" class="redeem-panel">
          <div class="section-heading"><div><h2>Redeem to bank</h2><p>Available: {{ data.availableCoins }} coins · Limits: {{ data.minimumRedemption }}–{{ data.maximumRedemption }}</p></div><button type="button" title="Close" (click)="showRedemption=false">×</button></div>
          <form (ngSubmit)="submitRedemption()" #redeemForm="ngForm" class="redeem-grid">
            <label>Account holder<input name="holder" [(ngModel)]="redemption.accountHolderName" required></label>
            <label>Bank name<input name="bank" [(ngModel)]="redemption.bankName" required></label>
            <label>Account number<input name="account" [(ngModel)]="redemption.accountNumber" inputmode="numeric" pattern="[0-9]{6,20}" required></label>
            <label>Confirm account<input name="confirm" [(ngModel)]="redemption.confirmAccountNumber" inputmode="numeric" required></label>
            <label>IFSC code<input name="ifsc" [(ngModel)]="redemption.ifscCode" pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" required></label>
            <label>Coins to redeem<input name="amount" [(ngModel)]="redemption.redeemAmount" type="number" [min]="data.minimumRedemption" [max]="maxRedeem" required></label>
            <button class="primary submit" type="submit" [disabled]="redeemForm.invalid || submitting">{{ submitting ? 'Submitting...' : 'Submit redemption' }}</button>
          </form>
        </section>

        <section class="summary-grid">
          <div><strong>{{ data.totalReferrals }}</strong><span>Total referrals</span></div><div><strong>{{ data.pendingReferrals }}</strong><span>Pending</span></div><div><strong>{{ data.qualifiedReferrals }}</strong><span>Qualified</span></div><div><strong>{{ data.rewardedReferrals }}</strong><span>Rewarded</span></div>
        </section>

        <div class="content-grid">
          <section><h2>Referrals</h2><div class="empty" *ngIf="!data.referrals.length">No referrals yet.</div><div class="row" *ngFor="let item of data.referrals"><div><strong>{{ item.name }}</strong><small>{{ item.userType }} · {{ item.joinDate | date:'mediumDate' }}</small></div><div><span class="status" [attr.data-status]="item.status">{{ item.status }}</span><small>{{ item.coinsEarned }} coins</small></div></div></section>
          <section><h2>Wallet history</h2><div class="empty" *ngIf="!data.transactions.length">No wallet activity yet.</div><div class="row" *ngFor="let item of data.transactions"><div><strong>{{ label(item.type) }}</strong><small>{{ item.date | date:'medium' }} · {{ item.remarks }}</small></div><strong [class.credit]="item.coinsAdded" [class.debit]="item.coinsDeducted">{{ item.coinsAdded ? '+' + item.coinsAdded : '-' + item.coinsDeducted }}</strong></div></section>
        </div>

        <section *ngIf="data.redemptions.length"><h2>Redemption requests</h2><button type="button" class="redemption-row" *ngFor="let item of data.redemptions" (click)="selectedRedemption=item"><div><strong>{{ item.bankName }} · {{ item.accountNumber }}</strong><small>{{ item.requestDate | date:'medium' }}</small></div><div><span class="status" [attr.data-status]="item.status">{{ item.status }}</span><small>{{ item.amount }} coins · View details</small></div></button></section>
      </ng-container>
      <div class="modal-backdrop" *ngIf="selectedRedemption" (click)="closeRedemption($event)"><section class="redemption-dialog" (click)="$event.stopPropagation()"><div class="dialog-header"><div><p class="eyebrow">REDEMPTION REQUEST</p><h2>Request details</h2><span>Submitted {{ selectedRedemption.requestDate | date:'medium' }}</span></div><button type="button" class="close-dialog" title="Close" (click)="selectedRedemption=null">×</button></div><div class="detail-grid"><div><span>Status</span><strong><span class="status" [attr.data-status]="selectedRedemption.status">{{ selectedRedemption.status }}</span></strong></div><div><span>Amount</span><strong>{{ selectedRedemption.amount }} coins</strong></div><div><span>Bank</span><strong>{{ selectedRedemption.bankName }}</strong></div><div><span>Account</span><strong>{{ selectedRedemption.accountNumber }}</strong></div></div><div class="outcome outcome-rejected" *ngIf="selectedRedemption.status==='REJECTED'"><span>Rejection reason</span><strong>{{ selectedRedemption.rejectionReason || 'No rejection reason was provided.' }}</strong></div><div class="outcome outcome-paid" *ngIf="(selectedRedemption.status==='PAID'||selectedRedemption.status==='CLOSED')"><span>Payment reference</span><strong>{{ selectedRedemption.paymentReference || 'Payment reference is not available yet.' }}</strong></div><div class="dialog-footer"><button type="button" (click)="selectedRedemption=null">Close</button></div></section></div>
    </main>
  `,
  styles: [`
    :host{display:block}.rewards-page{max-width:1100px;margin:auto;padding:24px 0 48px;color:#172033}.rewards-header{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:20px}.rewards-header h1{margin:4px 0;font-size:2rem}.rewards-header p{margin:0;color:#607086}.eyebrow{font-size:.75rem!important;font-weight:800;color:#087b6c!important}.primary,button{border:1px solid #ccd6df;background:#fff;border-radius:6px;padding:10px 14px;font-weight:700;cursor:pointer}.primary{background:#087b6c;color:#fff;border-color:#087b6c}.primary:disabled,button:disabled{opacity:.5;cursor:not-allowed}.balance-band{display:grid;grid-template-columns:1.4fr repeat(3,1fr);background:#102f3b;color:#fff;border-radius:8px;overflow:hidden}.balance-band div{display:grid;gap:4px;padding:22px;border-right:1px solid rgba(255,255,255,.14)}.balance-band span,.balance-band small{color:#bcd2d7}.balance-band strong{font-size:1.75rem}.referral-panel,.redeem-panel,section{margin-top:16px;background:#fff;border:1px solid #dce3e8;border-radius:8px;padding:18px}.referral-panel{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px}.code-block{display:grid;gap:4px}.code-block span{color:#607086;font-size:.8rem}.code-block strong{font-size:1.35rem;letter-spacing:.08em}.link-block{display:flex;align-items:center;min-width:0;border:1px solid #dce3e8;background:#f5f8fa;padding-left:12px;border-radius:6px}.link-block span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.link-block button{border-width:0 0 0 1px;border-radius:0 6px 6px 0}.actions{display:flex;gap:8px}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;padding:0;background:#dce3e8}.summary-grid div{background:#fff;padding:16px;display:grid;gap:4px}.summary-grid strong{font-size:1.4rem}.summary-grid span,.row small{color:#607086}.content-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.content-grid section{min-width:0}h2{font-size:1.05rem;margin:0 0 12px}.row{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-top:1px solid #edf1f3}.row>div{display:grid;gap:4px}.row>div:last-child{text-align:right}.redemption-row{display:flex;width:100%;justify-content:space-between;gap:16px;padding:12px 0;border:0;border-top:1px solid #edf1f3;border-radius:0;text-align:left}.redemption-row>div{display:grid;gap:4px}.redemption-row>div:last-child{text-align:right}.redemption-row:hover{background:#f7fafb}.status{font-size:.75rem;font-weight:800;padding:3px 7px;border-radius:4px;background:#e9eef2}.status[data-status=REWARDED],.status[data-status=PAID],.status[data-status=CLOSED]{background:#d9f5e8;color:#086844}.status[data-status=PENDING]{background:#fff1c9;color:#795500}.status[data-status=REJECTED]{background:#fee2e2;color:#991b1b}.credit{color:#087b6c}.debit{color:#b53737}.section-heading{display:flex;justify-content:space-between}.section-heading p{color:#607086;margin:4px 0}.redeem-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.redeem-grid label{display:grid;gap:5px;font-size:.85rem;font-weight:700}.redeem-grid input{min-height:42px;border:1px solid #cbd5df;border-radius:6px;padding:0 10px}.submit{grid-column:1/-1}.state{padding:30px;text-align:center}.error{color:#a22222}.empty{padding:20px 0;color:#607086}.modal-backdrop{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.56)}.redemption-dialog{width:min(580px,100%);max-height:90vh;overflow:auto;margin:0;background:#fff;border:1px solid #dce3e8;border-radius:14px;box-shadow:0 24px 70px rgba(15,23,42,.3)}.dialog-header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:22px 24px;border-bottom:1px solid #edf1f3}.dialog-header h2{margin:5px 0 3px}.dialog-header span{font-size:.8rem;color:#607086}.close-dialog{font-size:1.35rem;line-height:1;border:0;padding:6px 10px}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding:22px 24px}.detail-grid div{display:grid;gap:5px}.detail-grid div>span:first-child,.outcome>span{font-size:.75rem;color:#607086;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.detail-grid strong,.outcome strong{word-break:break-word}.outcome{margin:0 24px 18px;padding:14px 16px;display:grid;gap:6px;border-radius:8px}.outcome-rejected{background:#fff5f5;border:1px solid #fecaca}.outcome-rejected strong{color:#991b1b}.outcome-paid{background:#f0fdf4;border:1px solid #bbf7d0}.outcome-paid strong{color:#166534}.dialog-footer{display:flex;justify-content:flex-end;padding:16px 24px;border-top:1px solid #edf1f3}@media(max-width:760px){.rewards-page{padding:14px 0 36px}.rewards-header{align-items:stretch;flex-direction:column}.balance-band{grid-template-columns:1fr 1fr}.referral-panel{grid-template-columns:1fr}.link-block{width:100%}.actions button{flex:1}.summary-grid{grid-template-columns:1fr 1fr}.content-grid,.redeem-grid{grid-template-columns:1fr}.submit{grid-column:auto}}@media(max-width:560px){.detail-grid{grid-template-columns:1fr}}
  `]
})
export class ReferralRewardsComponent implements OnInit {
  dashboard: RewardDashboard | null = null;
  selectedRedemption: any = null;
  loading = true; error = ''; showRedemption = false; submitting = false;
  redemption = { accountHolderName: '', bankName: '', accountNumber: '', confirmAccountNumber: '', ifscCode: '', redeemAmount: 0 };
  constructor(private rewards: RewardsService, private toast: ToastService) {}
  ngOnInit(){ this.load(); }
  get maxRedeem(){ return Math.min(this.dashboard?.availableCoins || 0, this.dashboard?.maximumRedemption || 0); }
  closeRedemption(event: Event){ if(event.target === event.currentTarget) this.selectedRedemption = null; }
  load(){ this.loading=true; this.error=''; this.rewards.dashboard().subscribe({next:data=>{this.dashboard=data;this.loading=false;},error:err=>{this.error=err.error?.error?.message||'Unable to load rewards.';this.loading=false;}}); }
  async copy(value:string,message:string){ try{await navigator.clipboard.writeText(value);this.toast.show(message,'success');}catch{this.toast.show('Copy is unavailable on this device','warning');} }
  async share(){ if(!this.dashboard)return; const text=`Join me on CarShare247 and start ridesharing.\n\nUse my referral code:\n${this.dashboard.referralCode}\n\nRegister using:\n${this.dashboard.referralLink}`; try{if(navigator.share)await navigator.share({title:'Join CarShare247',text,url:this.dashboard.referralLink});else await this.copy(this.dashboard.referralLink,'Referral link copied');}catch(error:any){if(error?.name!=='AbortError')this.toast.show('Unable to open sharing','warning');} }
  submitRedemption(){ if(!this.dashboard)return;if(this.redemption.accountNumber!==this.redemption.confirmAccountNumber){this.toast.show('Account numbers do not match','warning');return;}this.submitting=true;this.rewards.redeem(this.redemption).subscribe({next:()=>{this.submitting=false;this.showRedemption=false;this.redemption={accountHolderName:'',bankName:'',accountNumber:'',confirmAccountNumber:'',ifscCode:'',redeemAmount:0};this.toast.show('Your redemption request has been submitted successfully and is pending review.','success');this.load();},error:err=>{this.submitting=false;this.toast.show(err.error?.error?.message||'Unable to submit redemption','error');}}); }
  label(value:string){ return String(value||'').replaceAll('_',' ').toLowerCase().replace(/^./,letter=>letter.toUpperCase()); }
}
