import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../auth.service';
import { OnboardingStateService } from './onboarding-state.service';

@Injectable({ providedIn: 'root' })
export class OnboardingGuard implements CanActivate {
  constructor(
    private router: Router,
    private auth: AuthService,
    private onboarding: OnboardingStateService,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const session = this.auth.current;
    if (!session) {
      this.router.navigateByUrl('/');
      return false;
    }

    const role = session.role;
    const target = state.url;

    if (role === 'owner' && target.startsWith('/owner/create-ride') && !this.onboarding.canOwnerPostRide()) {
      this.router.navigateByUrl('/owner/dashboard');
      return false;
    }

    return true;
  }
}
