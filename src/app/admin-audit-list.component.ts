import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({ selector:'app-admin-audit-list', standalone:true, imports:[CommonModule, FormsModule], template:`
<section class="page-header"><h1 class="page-title">Identity verification audit</h1></section>
<div class="card audit-filters"><select [(ngModel)]="role" (change)="load()"><option value="">All roles</option><option value="PASSENGER">Passengers</option><option value="OWNER">Owners</option></select><select [(ngModel)]="status" (change)="load()"><option value="">All statuses</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option><option value="PENDING_VERIFICATION">Pending</option></select><input [(ngModel)]="sessionId" placeholder="Session ID" (keyup.enter)="load()"><button class="btn btn-primary" (click)="load()">Search</button></div>
<div class="card audit-table"><p *ngIf="!audits.length">No verification records found.</p><table *ngIf="audits.length"><thead><tr><th>Role</th><th>Session</th><th>Status</th><th>Time</th><th>Payload</th></tr></thead><tbody><tr *ngFor="let audit of audits"><td>{{audit.userRole}}</td><td>{{audit.sessionId}}</td><td>{{audit.status}}</td><td>{{audit.createdAt | date:'medium'}}</td><td><pre>{{audit.rawPayloadJson}}</pre></td></tr></tbody></table></div>`, styles:[`.audit-filters{display:flex;gap:10px;flex-wrap:wrap}.audit-filters input,.audit-filters select{padding:10px;border:1px solid #cbd5e1;border-radius:8px}.audit-table{margin-top:16px;overflow:auto}table{width:100%;border-collapse:collapse}th,td{padding:10px;text-align:left;border-bottom:1px solid #e2e8f0;white-space:nowrap}pre{max-width:360px;max-height:100px;overflow:auto;white-space:pre-wrap}`] })
export class AdminAuditListComponent implements OnInit {
  audits:any[]=[]; role=''; status=''; sessionId='';
  constructor(private http:HttpClient){}
  ngOnInit(){this.load()}
  load(){const params:any={}; if(this.role)params.role=this.role;if(this.status)params.status=this.status;if(this.sessionId)params.sessionId=this.sessionId;this.http.get<any>(`${environment.apiBaseUrl}/v1/admin/verifications`,{params}).subscribe(r=>this.audits=r.data||[])}
}
