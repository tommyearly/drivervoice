# Drivers Voice

Independent driver-led website and private portal for Go-Ahead Ireland drivers. Proposed domain: driversvoice.ie.

Drivers Voice is an independent driver-led initiative. It is not operated by, endorsed by or speaking on behalf of Go-Ahead Ireland, SIPTU or the Workplace Relations Commission.

This repository does not make the service legally compliant. A controller, a privacy notice, a lawful basis and a representative review are still required before live records are collected.

## What is included

- Public pages: home, working plan, priorities, approved updates, about, conduct, privacy, contact and sign-in.
- Invitation-based driver portal with workplace concerns, incident follow-up, a priorities survey, volunteering, questions and an action tracker.
- Committee administration for assigned cases, publication drafts, survey totals, volunteers, a restricted process tracker, accounts and an audit log.
- Versioned SQL for PostgreSQL row-level security, private storage and server-side mutations.
- A labelled demonstration that uses fictional records and refuses live submissions.

The homepage illustration is an original drawing of fictional drivers and a generic unbranded bus. It is not a photograph and it is not evidence of a real event.

## Demonstration and live mode

The site stays in demonstration mode unless all three of `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are set, and `DRIVERSVOICE_MODE` is not `demo`.

In demonstration mode:

- Fictional accounts can be opened from the sign-in page.
- Forms and administration controls are disabled.
- The server refuses new reports, uploads, publication and email.
- Nothing in the demonstration is a real workplace record.

Set `DRIVERSVOICE_MODE=demo` to force the demonstration even when credentials are present.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Sign in with a fictional demonstration account to view the portal. Privileged demonstration accounts do not satisfy live multi-factor authentication.

## Checks

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Supabase

1. Create a project and run the SQL files in `supabase/migrations` in filename order.
2. Put the project URL, anon key and service-role key in server environment variables only. Do not prefix them with `NEXT_PUBLIC`.
3. In Authentication, enable email sign-in and require MFA for every privileged account before that account is used.
4. Confirm the `private-records` bucket remains private. Uploads stay disabled until the privacy configuration and a malware scanner are in place.
5. New accounts stay pending. A coordinator confirms eligibility with a short note. Do not ask for staff ID photographs, payslips or union cards merely to join.

The anon key is used on the server with the signed-in user’s session. Privileged writes go through database functions that read `auth.uid()` and the stored role assignments. A role sent by the browser is ignored.

## Email

Set `RESEND_API_KEY` and `EMAIL_FROM` to send mail. Messages contain a reference and a sign-in link. They do not contain report narratives.

The site does not email management, SIPTU or other external recipients. The reminder route at `POST /api/cron/reminders` sends only when `Authorization: Bearer <CRON_SECRET>` is present, the site is live, Resend is configured, and a driver has opted in. It sends the action reference only.

WhatsApp text on an approved update is for a person to copy. The site does not send WhatsApp messages.

## Roles

Assignments are stored per person and can be combined. A committee role does not grant access to every report.

| Role | Access |
| --- | --- |
| Driver | Own reports, own survey response, member updates and the member action tracker |
| Reviewer | Assigned cases only |
| Coordinator | Allocation and oversight of submitted cases, not another person’s drafts |
| Editor | Publication drafts, without automatic access to report evidence |
| Publisher | Approval of a different person’s reviewed draft |
| Survey administrator | Identifiable survey responses and suppressed totals |
| Technical administrator | Invitations, roles and revocation, without routine access to report content |

Privileged live actions require MFA (`aal2`). A person cannot grant a role to their own account. The publisher of an update must be a different person from the editor who reviewed it.

## Moderation and publication

Case statuses are: received, triage, more information needed, under review, referred, awaiting response, resolved and closed. The driver’s original account is stored separately from the assessment, private notes, member summary and public summary.

“Verified” requires a recorded source and a reviewer. It is never applied automatically.

A missed action date shows “Update due”. That flag does not say that anyone refused to act.

Public pages read approved public records only. A draft cannot be published until an editor reviews it and a different publisher approves it. Text that repeats a long stretch of a private record is rejected. There are no public comments.

The process tracker starts at “Not confirmed”. A WRC referral can be saved only with a confirmation source and date. Elapsed time is not treated as a stage. Process references stay off public pages.

The priorities survey is a consultation. It is not a union ballot and it is not anonymous. Totals are withheld when there are fewer than five responses or when a combination could still identify someone. Raw comments are not published.

Applying to volunteer does not appoint anyone. Contact details are not published.

## Privacy configuration before live collection

Live forms stay closed until a coordinator and a different technical administrator each confirm a complete settings record:

- Controller name and contact.
- Purposes and Article 6 basis.
- Article 9 condition, or an explicit decision that special-category data is not processed.
- Processors, hosting and transfers.
- Category-specific retention and review periods.
- Rights-request and breach-response procedures.
- An assessment of whether a DPIA is required.

The software does not choose these. One consent checkbox is not used as a lawful basis. The privacy page says who can see each form and does not promise anonymity, absolute confidentiality or legal privilege.

Document uploads remain off unless privacy configuration is complete, `UPLOADS_ENABLED=true` and `SCANNER_WEBHOOK_SECRET` is set. Even then, a file stays quarantined until a scan result is recorded. Nothing in this repository marks a file clean by itself.

A preservation hold blocks deletion. There is no job that deletes held records automatically.

## Deployment

The app is an Next.js App Router project and can be deployed on Vercel.

- Set the environment variables from `.env.example` in the project settings.
- Set `SITE_URL` to the real origin, without a path.
- Schedule `POST /api/cron/reminders` with the cron secret.
- Do not enable `NEXT_PUBLIC_DESIGN_PANEL` on the public site. It is a local design control and stores tokens in the browser only.
- Private routes send `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`. Robots rules are not an access control.

## Launch checks still required

- Confirm the controller, notice, processors and retention with the people responsible.
- Review every role with the drivers who will hold it.
- Enrol MFA for every privileged account and test revocation.
- Run the SQL on the real database and confirm row-level security with two real test accounts.
- Confirm email delivery contains only a reference and a sign-in link.
- Decide whether a DPIA is required.
- Do not describe the service as an official company, union or WRC system.

## Tests in this repository

`npm test` checks the in-memory access rules: one driver cannot read another driver’s report or survey response, an unassigned reviewer is refused, forged roles are ignored, unreviewed text cannot be published, private wording is blocked from public copy, demonstration writes are refused, and the SQL scripts enable row-level security. Those tests do not connect to a hosted database and they are not a legal review.
