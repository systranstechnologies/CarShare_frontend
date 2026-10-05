import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { MockDataService } from './mock-data.service';
import { RewardsService } from './services/rewards.service';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="admin-home">
      <header class="page-head">
        <div><p class="eyebrow">CARSHARE247 ADMIN</p><h1>Operations overview</h1><p>Review platform activity and open a workspace to take action.</p></div>
        <button type="button" class="signout" (click)="auth.logout()">Sign out</button>
      </header>

      <section class="metrics" aria-label="Platform summary">
        <div><span>Users</span><strong>{{ users }}</strong><small>All registered users</small></div>
        <div><span>Rides</span><strong>{{ rides }}</strong><small>All posted rides</small></div>
        <div><span>Approved subscriptions</span><strong>{{ approvedSubscriptions }}</strong><small>Active approvals recorded</small></div>
        <div><span>Resolved tickets</span><strong>{{ resolvedTickets }}</strong><small>Support issues closed</small></div>
      </section>

      <section class="workspace-list">
        <div class="section-title"><div><h2>Workspaces</h2><p>Each module opens in its own focused screen.</p></div></div>
        <div class="module-grid">
          <a *ngFor="let item of modules" [routerLink]="item.route" class="module-link">
            <span class="module-icon" aria-hidden="true">{{ item.icon }}</span>
            <span class="module-copy"><strong>{{ item.title }}</strong><small>{{ item.description }}</small></span>
            <span *ngIf="item.count !== undefined" class="module-count" [class.has-pending]="item.count > 0" [attr.aria-label]="item.count + ' pending items'">{{ item.count }}</span>
            <span class="arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.admin-home{max-width:1180px;margin:0 auto;padding:34px 0 56px;color:#172033}.page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:26px}.eyebrow{margin:0 0 7px;color:#087b6c;font-size:.72rem;font-weight:900;letter-spacing:.12em}.page-head h1{margin:0;font-size:clamp(2rem,4vw,3.25rem);letter-spacing:0}.page-head p{margin:8px 0 0;color:#617083}.signout{min-height:42px;border:1px solid #ccd6df;background:#fff;border-radius:6px;padding:0 16px;font-weight:700;cursor:pointer}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #dce4e8;border-radius:8px;overflow:hidden;background:#dce4e8;gap:1px}.metrics div{display:grid;gap:6px;background:#fff;padding:20px}.metrics span,.metrics small{color:#617083}.metrics strong{font-size:1.8rem;color:#087b6c}.workspace-list{margin-top:24px}.section-title h2{margin:0;font-size:1.2rem}.section-title p{margin:4px 0 14px;color:#617083}.module-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.module-link{display:grid;grid-template-columns:44px 1fr auto 24px;align-items:center;gap:14px;min-height:92px;padding:16px;border:1px solid #dce4e8;border-radius:8px;background:#fff;color:#172033;text-decoration:none}.module-link:hover{border-color:#66a99f;box-shadow:0 8px 24px rgba(23,32,51,.07)}.module-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:6px;background:#e8f5f2;color:#087b6c;font-size:1.25rem;font-weight:900}.module-copy{display:grid;gap:4px}.module-copy small{color:#617083;line-height:1.4}.module-count{min-width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:#edf1f3;color:#617083;font-size:.8rem;font-weight:900}.module-count.has-pending{background:#fff0c2;color:#785500}.arrow{font-size:1.25rem;color:#087b6c}@media(max-width:760px){.admin-home{padding:18px 0 40px}.page-head{align-items:flex-start;flex-direction:column}.metrics{grid-template-columns:1fr 1fr}.module-grid{grid-template-columns:1fr}}@media(max-width:420px){.metrics{grid-template-columns:1fr}}
  `]
})
export class AdminHomeComponent {
  users=0; rides=0; approvedSubscriptions=0; resolvedTickets=0;
  readonly modules=[
    {title:'Subscriptions',description:'Review payments, approve UTR submissions, and export the ledger.',route:'/Kumaresh/subscriptions',icon:'₹',count:0},
    {title:'Users',description:'Inspect registered owners and account verification details.',route:'/Kumaresh/users',icon:'U',count:0},
    {title:'Rides',description:'Monitor active, completed, cancelled, and female-only rides.',route:'/Kumaresh/rides',icon:'R'},
    {title:'Support tickets',description:'Triage user issues and record resolutions.',route:'/Kumaresh/tickets',icon:'?',count:0},
    {title:'Didit verification',description:'Review identity sessions and synchronize decisions with Didit.',route:'/Kumaresh/didit',icon:'ID',count:0},
    {title:'Rewards & redemptions',description:'Manage referrals, wallet adjustments, settings, and payouts.',route:'/Kumaresh/rewards',icon:'C',count:0}
  ];
  constructor(public auth:AuthService,private data:MockDataService,private rewards:RewardsService,router:Router){
    if(auth.current?.role!=='admin'){void router.navigateByUrl('/Kumaresh');return;}
    data.getAdminUsers().subscribe({next:rows=>{this.users=rows?.length||0;this.setCount('Users',(rows||[]).filter((item:any)=>['PENDING','PENDING_VERIFICATION','UNDER_REVIEW','IN_REVIEW','INITIATED'].includes(String(item.verificationStatus||'').toUpperCase())).length)}});
    data.getAdminRides().subscribe({next:rows=>this.rides=rows?.length||0});
    data.getAdminSubscriptions('').subscribe({next:rows=>{const items=rows||[];this.approvedSubscriptions=items.filter((item:any)=>item.status==='PAID').length;this.setCount('Subscriptions',items.filter((item:any)=>['PENDING','VERIFICATION_IN_PROGRESS'].includes(String(item.status||'').toUpperCase())).length)}});
    data.getAdminTickets('').subscribe({next:rows=>{const items=rows||[];this.resolvedTickets=items.filter((item:any)=>String(item.status||'').toUpperCase()==='RESOLVED').length;this.setCount('Support tickets',items.filter((item:any)=>String(item.status||'').toUpperCase()!=='RESOLVED').length)}});
    data.getAdminDiditVerifications().subscribe({next:rows=>this.setCount('Didit verification',(rows||[]).filter((item:any)=>['PENDING_VERIFICATION','UNDER_REVIEW','INITIATED','IN_REVIEW'].includes(String(item.status||'').toUpperCase())).length)});
    rewards.adminMetrics().subscribe({next:metrics=>this.setCount('Rewards & redemptions',Number(metrics?.pendingRedemptions||0))});
  }
  private setCount(title:string,count:number){const item=this.modules.find(module=>module.title===title);if(item)item.count=count;}
}
