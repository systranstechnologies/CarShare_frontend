import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  companyName = 'CarShare247';
  companyYear = new Date().getFullYear();
  currentUserRole: string = '';

  constructor(private auth: AuthService) {}

  ngOnInit() {
    if (this.auth.current) {
      this.currentUserRole = this.auth.current.role || 'passenger';
    }
  }
}
