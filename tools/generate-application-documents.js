const pptxgen = require('pptxgenjs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType } = require('docx');
const fs = require('fs');
const path = require('path');

const ShapeType = new pptxgen().ShapeType;
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'deliverables');
const logo = path.join(root, 'src', 'assets', 'carShare-logo.png');
fs.mkdirSync(output, { recursive: true });

const C = { ink: '10233F', teal: '087E8B', lime: 'CBEF43', coral: 'FF6B5A', sky: 'E8F5F7', mist: 'F5F8FA', gray: '607083', white: 'FFFFFF' };
const W = 13.333, H = 7.5;

function deck(title, subject) {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'CarShare247';
  pptx.subject = subject;
  pptx.title = title;
  pptx.company = 'CarShare247';
  pptx.lang = 'en-IN';
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'en-IN' };
  return pptx;
}

function header(slide, section, page) {
  slide.background = { color: C.mist };
  slide.addShape(ShapeType.rect, { x: 0, y: 0, w: W, h: 0.18, fill: { color: C.teal }, line: { color: C.teal } });
  if (fs.existsSync(logo)) slide.addImage({ path: logo, x: 0.45, y: 0.36, w: 0.35, h: 0.35 });
  slide.addText(`CARSHARE247  |  ${section.toUpperCase()}`, { x: 0.9, y: 0.43, w: 6.5, h: 0.2, fontFace: 'Aptos', fontSize: 8, bold: true, color: C.teal, charSpace: 1.2, margin: 0 });
  slide.addText(String(page), { x: 12.25, y: 0.4, w: 0.5, h: 0.2, fontSize: 9, color: C.gray, align: 'right', margin: 0 });
}

function titleSlide(pptx, kicker, title, subtitle, audience) {
  const slide = pptx.addSlide();
  slide.background = { color: C.ink };
  slide.addShape(ShapeType.rect, { x: 8.6, y: 0, w: 4.74, h: H, fill: { color: C.teal, transparency: 10 }, line: { color: C.teal, transparency: 100 } });
  slide.addShape(ShapeType.arc, { x: 9.1, y: 1.0, w: 5.8, h: 5.8, adjustPoint: 0.3, line: { color: C.lime, transparency: 20, width: 1.4 }, fill: { color: C.ink, transparency: 100 } });
  if (fs.existsSync(logo)) slide.addImage({ path: logo, x: 0.7, y: 0.62, w: 0.75, h: 0.75 });
  slide.addText(kicker.toUpperCase(), { x: 0.72, y: 1.78, w: 4, h: 0.25, fontSize: 10, color: C.lime, bold: true, charSpace: 1.5, margin: 0 });
  slide.addText(title, { x: 0.7, y: 2.15, w: 7.4, h: 1.45, fontFace: 'Aptos Display', fontSize: 35, bold: true, color: C.white, breakLine: false, margin: 0, fit: 'shrink' });
  slide.addText(subtitle, { x: 0.73, y: 3.85, w: 6.5, h: 0.75, fontSize: 17, color: 'D9E5ED', breakLine: false, margin: 0.02, fit: 'shrink' });
  slide.addText(audience, { x: 0.73, y: 6.55, w: 4.8, h: 0.25, fontSize: 10, color: 'A8C2D1', margin: 0 });
}

function contentSlide(pptx, section, page, title, subtitle, columns) {
  const slide = pptx.addSlide();
  header(slide, section, page);
  slide.addText(title, { x: 0.55, y: 0.95, w: 12, h: 0.52, fontFace: 'Aptos Display', fontSize: 25, bold: true, color: C.ink, margin: 0 });
  if (subtitle) slide.addText(subtitle, { x: 0.58, y: 1.52, w: 11.8, h: 0.34, fontSize: 11.5, color: C.gray, margin: 0 });
  const gap = 0.28, x = 0.58, y = 2.12, available = 12.15;
  const width = (available - gap * (columns.length - 1)) / columns.length;
  columns.forEach((column, index) => {
    const left = x + index * (width + gap);
    slide.addShape(ShapeType.roundRect, { x: left, y, w: width, h: 4.55, rectRadius: 0.08, fill: { color: C.white }, line: { color: 'D8E2E8', width: 0.8 }, shadow: { type: 'outer', color: '93A4B2', opacity: 0.12, blur: 1, angle: 45, distance: 1 } });
    slide.addShape(ShapeType.rect, { x: left, y, w: 0.1, h: 4.55, fill: { color: column.color || C.teal }, line: { color: column.color || C.teal } });
    slide.addText(column.heading, { x: left + 0.3, y: y + 0.28, w: width - 0.55, h: 0.35, fontSize: 15, bold: true, color: C.ink, margin: 0 });
    const items = column.items.map(text => ({ text, options: { bullet: { indent: 14 }, hanging: 3 } }));
    slide.addText(items, { x: left + 0.28, y: y + 0.82, w: width - 0.5, h: 3.45, fontSize: 12, color: '33475B', breakLine: true, paraSpaceAfterPt: 11, margin: 0.02, valign: 'top', fit: 'shrink' });
    if (column.note) slide.addText(column.note, { x: left + 0.3, y: y + 4.12, w: width - 0.5, h: 0.25, fontSize: 9.5, italic: true, color: C.gray, margin: 0, fit: 'shrink' });
  });
}

function flowSlide(pptx, section, page, title, steps) {
  const slide = pptx.addSlide();
  header(slide, section, page);
  slide.addText(title, { x: 0.55, y: 0.95, w: 12, h: 0.55, fontFace: 'Aptos Display', fontSize: 25, bold: true, color: C.ink, margin: 0 });
  const cardW = 2.75, gap = 0.35, start = 0.55;
  steps.forEach((step, index) => {
    const x = start + index * (cardW + gap);
    if (index) slide.addShape(ShapeType.chevron, { x: x - 0.26, y: 3.28, w: 0.22, h: 0.32, fill: { color: C.teal }, line: { color: C.teal } });
    slide.addShape(ShapeType.roundRect, { x, y: 2.25, w: cardW, h: 2.55, rectRadius: 0.06, fill: { color: index % 2 ? C.sky : C.white }, line: { color: 'C9DDE2', width: 0.8 } });
    slide.addText(`0${index + 1}`, { x: x + 0.25, y: 2.5, w: 0.45, h: 0.25, fontSize: 10, bold: true, color: C.teal, margin: 0 });
    slide.addText(step.title, { x: x + 0.25, y: 2.88, w: cardW - 0.5, h: 0.42, fontSize: 16, bold: true, color: C.ink, margin: 0, fit: 'shrink' });
    slide.addText(step.body, { x: x + 0.25, y: 3.48, w: cardW - 0.5, h: 0.9, fontSize: 11.5, color: C.gray, breakLine: false, margin: 0, fit: 'shrink' });
  });
}

async function makeUserDeck() {
  const pptx = deck('CarShare247: User Guide', 'User application overview');
  titleSlide(pptx, 'User guide', 'Travel better together.', 'An overview of how CarShare247 helps passengers find trusted rides and enables owners to share available seats.', 'Prepared for current and prospective users | September 2026');
  contentSlide(pptx, 'User guide', 2, 'What CarShare247 is for', 'A two-sided car-pooling experience built around verified people, transparent trip details, and direct coordination.', [
    { heading: 'Passengers', color: C.teal, items: ['Search rides by start, destination, date, and seats.', 'Book only the section of a multi-stop route you need.', 'Track booking status, contact the owner, cancel when eligible, and rate completed trips.'] },
    { heading: 'Car Owners', color: C.coral, items: ['Verify identity, activate a subscription, and publish rides.', 'Set a fixed whole-route price or price each journey segment.', 'Control seat availability, female-only visibility, and booking approvals.'] },
    { heading: 'Trust by design', color: '6D5BD0', items: ['Mobile OTP, identity-verification stages, and live profile-photo capture.', 'Ratings, cancellation reasons, support tickets, urgent safety reporting, and user blocking.', 'Emergency calling is available from an accepted booking.'] }
  ]);
  flowSlide(pptx, 'User guide', 3, 'Passenger journey', [
    { title: 'Create account', body: 'Choose Passenger, provide profile details, verify mobile OTP, and complete identity verification.' },
    { title: 'Find a route', body: 'Browse routes by from/to stops, travel date, and required seats before verification is approved.' },
    { title: 'Request booking', body: 'Complete identity verification, review segment price and terms, then submit a request for owner approval.' },
    { title: 'Manage the trip', body: 'See booking status, call the owner, share location, cancel, rate, report concerns, or block an owner.' }
  ]);
  flowSlide(pptx, 'User guide', 4, 'Owner journey', [
    { title: 'Register', body: 'Select Owner, complete mobile OTP, identity verification, and live-photo capture.' },
    { title: 'Activate', body: 'Choose a plan, make the UPI payment, submit UTR, and wait for administrative approval.' },
    { title: 'Publish ride', body: 'Set travel date, route stops, timing, prices, vehicle, seats, and audience controls.' },
    { title: 'Respond', body: 'Manage ride listings and accept or decline passenger booking requests.' }
  ]);
  contentSlide(pptx, 'User guide', 5, 'Screens you will use', 'The product provides purpose-built screens for each major stage of a shared journey.', [
    { heading: 'Entry & setup', items: ['Welcome / login screen with Passenger and Car Owner role selection.', 'Guided registration progress, OTP verification, KYC status, and live-photo capture.'] },
    { heading: 'Finding & booking', color: C.teal, items: ['Ride discovery is available before identity approval; booking is verification-gated.', 'Ride cards show route stops, driver rating, vehicle, available seats, price, and female-only marker.', 'Booking confirmation clearly states pending owner approval.'] },
    { heading: 'Ongoing management', color: C.coral, items: ['Passenger bookings: status, owner call, cancellation, location sharing, rating, emergency call, safety report, and block control.', 'Owner dashboard: ride creation, ride list, booking requests, plans, payments, and profile.'] }
  ]);
  contentSlide(pptx, 'User guide', 6, 'Notifications and support', 'Keep important ride and account events visible across the web and Android app.', [
    { heading: 'What can notify you', items: ['Booking and account messages delivered while the app is active.', 'A badge counter tracks new notifications inside the app.', 'Notification actions include a route so the app can open the relevant destination.'] },
    { heading: 'Where it works', color: C.teal, items: ['Web: Firebase Cloud Messaging with a service worker and browser permission.', 'Android: Capacitor push notifications plus local foreground notifications on a CarShare247 channel.'] },
    { heading: 'Get help and stay safe', color: C.coral, items: ['Accepted booking details include Emergency: call 112.', 'Safety reports open a prefilled support ticket and use the dedicated SAFETY_INCIDENT category.', 'Urgent tickets are prioritised in the admin queue; users can also block an owner to prevent future bookings between them.'] }
  ]);
  contentSlide(pptx, 'User guide', 7, 'Privacy and practical expectations', 'A clear explanation of the safeguards already present, without promising outcomes beyond the implemented product.', [
    { heading: 'Verification', items: ['Phone OTP is part of account onboarding.', 'The registration flow integrates DIDIT identity verification and a live profile-photo capture step.', 'Some experiences are gated until verification is approved.'] },
    { heading: 'Permissions', color: C.teal, items: ['Notifications require browser or device permission.', 'Live-location sharing requires geolocation permission and opens a WhatsApp sharing flow.', 'Camera access is used for live-photo capture in registration.'] },
    { heading: 'Before and during travel', color: C.coral, items: ['Review route, stops, price, available seats, owner rating, and verified-owner marker.', 'A booking remains pending until the owner approves it.', 'Use the safety panel in an accepted booking to call 112, report a concern, or block the owner.'] }
  ]);
  contentSlide(pptx, 'User guide', 8, 'Available on web and Android', 'CarShare247 is an Angular web application that can also be packaged as an Android app.', [
    { heading: 'Web', items: ['Runs in modern browsers.', 'Uses a Firebase messaging service worker for web push.', 'Hosted deployment is configured for Netlify with single-page-app route fallback.'] },
    { heading: 'Android', color: C.teal, items: ['Packaged using Capacitor Android.', 'Uses native push and local notifications.', 'Requires a build with native notifications configured.'] },
    { heading: 'A note on access', color: C.coral, items: ['Functionality depends on account role, verification state, subscription state for owners, and device permissions.', 'Availability and matching rides depend on current published ride data.'] }
  ]);
  await pptx.writeFile({ fileName: path.join(output, 'CarShare247_User_Guide.pptx') });
}

async function makeInvestorDeck() {
  const pptx = deck('CarShare247: Investor Overview', 'Investor application overview');
  titleSlide(pptx, 'Investor overview', 'CarShare247', 'A verified, multi-stop car-pooling platform designed to make unused vehicle capacity bookable at the journey-segment level.', 'Prepared for investor and strategic-partner discussions | September 2026');
  contentSlide(pptx, 'Investor overview', 2, 'The opportunity', 'CarShare247 addresses the friction between passengers seeking affordable point-to-point travel and owners with unused seats.', [
    { heading: 'Passenger problem', items: ['Transport options can be expensive, inflexible, or mismatched to an exact pickup and drop-off.', 'Trust and route clarity are critical when travelling with an unfamiliar driver.'] },
    { heading: 'Owner problem', color: C.coral, items: ['Owners need a lightweight way to publish capacity and control who can request a seat.', 'Monetisation must be gated by verification and straightforward payment administration.'] },
    { heading: 'Product response', color: C.teal, items: ['Multi-stop search and segment booking.', 'Verification-led onboarding and ratings.', 'Owner subscriptions, booking approvals, notifications, and administrative review.'] }
  ]);
  contentSlide(pptx, 'Investor overview', 3, 'Product differentiation', 'The implemented product is focused on operational controls that make a car-pooling marketplace workable.', [
    { heading: 'Multi-stop economics', items: ['Owners can price an entire route or individual segments.', 'Passengers search between any two stops and book only their required portion.', 'A route preview exposes stops, timing, capacity, and price context.'] },
    { heading: 'Trust workflow', color: C.teal, items: ['OTP, DIDIT identity verification, and live-photo capture are integrated into onboarding.', 'Discovery is open before verification; booking remains verification-gated.', 'Ratings, safety tickets, emergency calling, mutual booking blocks, and audit logs provide operating controls.'] },
    { heading: 'Controlled supply', color: C.coral, items: ['Owners create routes, capacity, vehicle details, and optional female-only visibility.', 'Booking requests await owner approval.', 'Subscriptions are reviewed through a UTR workflow before owners can post rides.'] }
  ]);
  flowSlide(pptx, 'Investor overview', 4, 'Marketplace operating loop', [
    { title: 'Acquire & verify', body: 'Passenger and owner mobile onboarding; DIDIT and photo workflow establish an identity layer.' },
    { title: 'Activate supply', body: 'Owner selects subscription, submits payment evidence, and receives administrative approval.' },
    { title: 'Match demand', body: 'Passengers search routes and seats; segment logic exposes relevant ride portions.' },
    { title: 'Complete & retain', body: 'Owners decide on requests; notifications, support, cancellation, and ratings support repeat use.' }
  ]);
  contentSlide(pptx, 'Investor overview', 5, 'Revenue design and monetisation levers', 'The current implementation contains an owner subscription workflow; pricing, take rates, and unit economics still require commercial validation.', [
    { heading: 'Implemented today', items: ['Owner plan selection and checkout initiation.', 'UPI payment details and UTR submission.', 'Administrative approval/rejection with subscription expiry dates and activation state.'] },
    { heading: 'Potential extensions', color: C.teal, items: ['Tiered owner plans by route volume, geography, or feature access.', 'Marketplace booking fees or payment-provider take rate.', 'Fleet, corporate commute, or community partnerships.'] },
    { heading: 'Validation needed', color: C.coral, items: ['Conversion from owner registration to activated subscription.', 'Ride-fill rate, repeat-booking rate, and cost to acquire each side of the marketplace.', 'Payment reconciliation effort and support cost per active ride.'] }
  ]);
  contentSlide(pptx, 'Investor overview', 6, 'Technical architecture', 'A practical web-first stack with Android packaging and cloud messaging.', [
    { heading: 'Client platform', items: ['Angular 17 standalone components and router-based views.', 'RxJS state streams and HTTP services.', 'Capacitor packages the same application for Android.'] },
    { heading: 'Service integration', color: C.teal, items: ['REST API requests through an environment-configured API base URL.', 'Firebase Cloud Messaging for web foreground messages and token registration.', 'Native Android push plus local notifications via Capacitor.'] },
    { heading: 'Operational controls', color: C.coral, items: ['DIDIT verification session/status integration.', 'Subscription checkout, UTR submission, approval, and rejection states.', 'Urgent safety tickets are escalated to administrators, ordered ahead of standard tickets, and recorded in audit logs.'] }
  ]);
  contentSlide(pptx, 'Investor overview', 7, 'Deployment readiness', 'The codebase supports web hosting and Android packaging, with clear production hardening items.', [
    { heading: 'Web delivery', items: ['Angular production build output: dist/car-pool/browser.', 'Netlify build configuration with SPA redirect fallback.', 'Firebase messaging service worker included as a build asset.'] },
    { heading: 'Android delivery', color: C.teal, items: ['Capacitor Android project is present.', 'Package scripts build the production web app then synchronise native assets.', 'Native push is feature-flagged by the environment configuration.'] },
    { heading: 'Before scale', color: C.coral, items: ['Dependabot is configured for npm, Maven, and GitHub Actions dependency updates.', 'Resolve dependency audit findings and align Node runtime with Angular-supported versions.', 'Establish monitoring, alerting, backup/recovery, and release environments.'] }
  ]);
  contentSlide(pptx, 'Investor overview', 8, 'Execution risks and mitigations', 'The following are diligence considerations, derived from the implemented product rather than claims about production results.', [
    { heading: 'Liquidity risk', items: ['A two-sided marketplace needs enough active routes and passenger demand in each launch zone.', 'Mitigation: concentrate launches by corridor, employer, campus, or community.'] },
    { heading: 'Trust & safety', color: C.coral, items: ['Identity verification helps but does not replace safety operations or incident response.', 'Implemented mitigation: 112 emergency action, urgent safety tickets, admin escalation, audit logs, and mutual booking blocks.', 'Remaining need: formal policies, trained support coverage, and response SLAs.'] },
    { heading: 'Operational load', color: C.teal, items: ['Manual UTR approval can constrain scale.', 'Mitigation: payment-provider confirmation, reconciliation tooling, and exception queues.'] }
  ]);
  contentSlide(pptx, 'Investor overview', 9, 'Metrics to instrument next', 'These indicators would turn the current product into a measurable operating model.', [
    { heading: 'Supply', items: ['Verified owners, activated subscriptions, published rides, and active seats by corridor.', 'Time from owner registration to first published ride.'] },
    { heading: 'Demand & matching', color: C.teal, items: ['Search-to-request and request-to-accepted-booking conversion.', 'Segment occupancy, cancellation rate, and repeat passenger rate.'] },
    { heading: 'Trust & economics', color: C.coral, items: ['Verification completion and rejection rates.', 'Subscription conversion, revenue per activated owner, support volume, and incident resolution time.'] }
  ]);
  await pptx.writeFile({ fileName: path.join(output, 'CarShare247_Investor_Overview.pptx') });
}

function heading(text, level = HeadingLevel.HEADING_1) { return new Paragraph({ text, heading: level, spacing: { before: 260, after: 120 } }); }
function bullets(items) { return items.map(text => new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 75 } })); }
function cell(text, fill, bold = false) { return new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: fill ? { type: ShadingType.CLEAR, color: fill } : undefined, children: [new Paragraph({ children: [new TextRun({ text, bold })] })] }); }

async function makeUiReview() {
  const document = new Document({ sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children: [
    new Paragraph({ text: 'CarShare247', heading: HeadingLevel.TITLE, spacing: { after: 100 } }),
    new Paragraph({ text: 'UI and Application Flow Review', heading: HeadingLevel.SUBTITLE, spacing: { after: 140 } }),
    new Paragraph({ text: 'Scope: Angular web application and Android-capable Capacitor implementation. This assessment is based on source review and a live inspection of the authentication screen on 2 September 2026.', italics: true, spacing: { after: 300 } }),
    heading('1. Executive Summary'),
    new Paragraph('CarShare247 presents a strong functional foundation for a verified, two-sided car-pooling marketplace. The main passenger flow is visible and coherent: onboarding, identity verification, route search, segment selection, owner approval, booking management, and rating. The owner path extends this with verification, subscription activation, ride creation, and booking response. An administrative console supplies review functions for subscriptions, users, rides, verification, and support.'),
    new Paragraph('The safety flow has been strengthened: passengers can browse rides before verification, while booking remains verification-gated. Accepted booking details now use a mobile-responsive action hierarchy for location sharing, cancellation, emergency calling, safety reporting, and owner blocking. The most significant remaining UX opportunity is visual consistency: the entry, ride, owner, and administrative views still use distinct component-level visual systems.'),
    heading('2. Observed Application Flow'),
    heading('2.1 Passenger Flow', HeadingLevel.HEADING_2),
    ...bullets(['Entry: User chooses registration or login, then selects Passenger or Car Owner.', 'Registration: Passenger supplies basic details, verifies their mobile with OTP, completes DIDIT identity verification, and captures a live photo.', 'Discovery: Passenger can browse multi-stop availability before verification by selecting origin, destination, date, and required seats.', 'Evaluation: Results show route, times, price, driver rating, vehicle, availability, stop-by-stop route preview, and female-only marker where applicable.', 'Booking: Identity approval is required before a passenger can request a booking. The request remains pending owner approval.', 'Trip management: Accepted booking details include location sharing, cancellation, rating, a 112 emergency action, prefilled safety reporting, and owner blocking. The backend rejects future booking attempts between blocked users in either direction.']),
    heading('2.2 Owner Flow', HeadingLevel.HEADING_2),
    ...bullets(['Owner onboarding follows basic details, OTP, DIDIT verification, and live photo capture.', 'An owner chooses a subscription plan, pays through the configured payment experience, submits a UTR reference, and awaits administrative review.', 'After activation, the owner creates a ride with date, vehicle, capacity, female-only visibility, route stops, arrival/departure time, and fixed or segmented prices.', 'The owner dashboard links to ride management and booking requests so the owner can respond to passenger requests.']),
    heading('2.3 Administrative Flow', HeadingLevel.HEADING_2),
    ...bullets(['The admin console provides tabbed lists for subscriptions, users, rides, support tickets, and DIDIT verification.', 'Safety reports use a SAFETY_INCIDENT category and an URGENT priority, with urgent tickets ordered first and an urgent admin notification.', 'Ticket creation and resolution are written to audit logs. The dashboard remains table-centric and depends on horizontal scrolling for dense information.']),
    heading('3. UI Inventory'),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [cell('Area', '087E8B', true), cell('Observed interface', '087E8B', true), cell('Primary user value', '087E8B', true), cell('Assessment', '087E8B', true)] }),
      new TableRow({ children: [cell('Authentication'), cell('Split hero and login/register card; role switch; OTP fields.'), cell('Clear entry and account type choice.'), cell('Strong first impression; role/login rules add cognitive load.')] }),
      new TableRow({ children: [cell('Registration'), cell('Progress tracker, verification status, live-camera capture.'), cell('Makes compliance steps explicit.'), cell('Functional but lengthy; copy and recovery states matter greatly.')] }),
      new TableRow({ children: [cell('Ride search'), cell('Four-field form, location suggestions, ride cards, route timeline.'), cell('Supports precise multi-stop matching.'), cell('Core marketplace experience; dense but informative.')] }),
      new TableRow({ children: [cell('Booking'), cell('Segment summary, route, price breakdown, terms, confirmation, and accepted-booking safety panel.'), cell('Sets request expectations and provides trip safety actions.'), cell('Safety actions are grouped and stack below 420px for mobile readability.')] }),
      new TableRow({ children: [cell('Owner creation'), cell('Five-stage form with dynamic stops and pricing.'), cell('Allows sophisticated route publishing.'), cell('Powerful, but needs careful defaults and validation feedback.')] }),
      new TableRow({ children: [cell('Admin'), cell('Stats, tabs, tables, status chips, review actions.'), cell('Centralises operating work.'), cell('Appropriate for desktop; needs a deliberate mobile admin strategy.')] })
    ] }),
    heading('4. Strengths'),
    ...bullets(['Clear role separation: passenger, owner, and administrator journeys map to real marketplace responsibilities.', 'Ride discovery before identity approval reduces early funnel friction while keeping booking verification-gated.', 'Trust is embedded through OTP, DIDIT status, live photo capture, ratings, urgent safety reporting, emergency calling, mutual booking blocks, and moderated operational queues.', 'The accepted-booking safety panel has a distinct mobile-responsive hierarchy rather than a cluttered stack of destructive controls.', 'Multi-stop routes and segment pricing are meaningful functional differentiation over basic origin-to-destination ride lists.', 'Push design spans web and Android: Firebase Cloud Messaging/web service worker plus Capacitor native and local notifications.', 'Dependabot is configured for npm, Maven, and GitHub Actions updates.']),
    heading('5. Constraints and Risks'),
    ...bullets(['Visual inconsistency: component-local styling results in different radius, color, typography, and button patterns across the product.', 'Onboarding friction remains: OTP, identity verification, live photo, and owner payment approval are justified trust controls but form a long conversion funnel.', 'Manual operational dependency: UTR-based subscription verification requires admin capacity and clear turnaround expectations.', 'Admin density: urgent tickets are prioritised, but tables still have high information value and depend on wide layouts.', 'Permissions and environment sensitivity: camera guidance now explains denied/unavailable access, but push and location still depend on device consent and supported contexts.', 'Hard-coded usage claims were replaced with product-value messaging. Real scale figures should come from verified analytics.', 'Dependency update automation is configured, but current audit findings still require a controlled remediation cycle.']),
    heading('6. Prioritised Recommendations'),
    heading('P0: Conversion and trust clarity', HeadingLevel.HEADING_2),
    ...bullets(['Publish a single registration checklist showing exactly why each verification step is needed, what is stored, and what happens after approval.', 'Add durable status and recovery states for OTP, DIDIT review, payment review, rejected verification, and rejected UTR. Include expected next action and response timing.', 'Use server-confirmed entitlement states consistently, with friendly blocked-state messages for search, booking, and owner publishing.']),
    heading('P1: Design-system consolidation', HeadingLevel.HEADING_2),
    ...bullets(['Define shared tokens for color, spacing, radius, elevation, input, button, card, status chip, and table patterns.', 'Adopt one primary brand direction; the existing teal route/owner treatment is a strong candidate, while the blue/purple gradients can become a restrained accent.', 'Replace emoji-dependent controls with a consistent icon set and accessible labels, especially in work-oriented screens.']),
    heading('P2: Flow optimisation', HeadingLevel.HEADING_2),
    ...bullets(['Preserve passenger search criteria and provide obvious edit controls from search results and booking.', 'Make seat selection visibly editable at the most relevant stage, or explain why it is locked from the search request.', 'Provide admin queue filters, bulk review safeguards, SLA indicators, and a mobile-friendly detail view rather than relying solely on wide tables.']),
    heading('P3: Measurement and quality', HeadingLevel.HEADING_2),
    ...bullets(['Instrument funnel exits across registration, verification, plan payment, ride creation, search, request, acceptance, cancellation, and rating.', 'Add usability testing with passengers and owners in a single launch corridor before extending supply geography.', 'Run accessibility review for keyboard traversal, focus visibility, color contrast, error announcements, and responsive behaviour.']),
    heading('7. Architecture and Deployment Snapshot'),
    ...bullets(['Frontend: Angular 17 standalone components, Angular Router, reactive forms, RxJS, and HTTP services.', 'Backend interface: environment-configured REST endpoints for registration, DIDIT verification, rides, bookings, subscriptions, support, and push token registration.', 'Notifications: Firebase Cloud Messaging handles web messaging and registration tokens; Capacitor Push Notifications and Local Notifications serve the Android build.', 'Hosting: Netlify is configured to run the Angular production build and publish dist/car-pool/browser with SPA fallback.', 'Android: Capacitor configuration targets com.carpool.app; package scripts build the web assets and synchronise them to the Android project.']),
    heading('8. Conclusion'),
    new Paragraph('CarShare247 has a genuinely differentiated core workflow in multi-stop ride publishing and segment booking, supported by unusually complete verification and administrative controls for a prototype-stage marketplace. The highest-leverage next step is not another standalone screen: it is making the existing flow feel like one coherent, measured, and operationally scalable product.'),
  ] }] });
  const buffer = await Packer.toBuffer(document);
  fs.writeFileSync(path.join(output, 'CarShare247_UI_Flow_Review.docx'), buffer);
}

Promise.all([makeUserDeck(), makeInvestorDeck(), makeUiReview()])
  .then(() => console.log(`Created documents in ${output}`))
  .catch(error => { console.error(error); process.exitCode = 1; });