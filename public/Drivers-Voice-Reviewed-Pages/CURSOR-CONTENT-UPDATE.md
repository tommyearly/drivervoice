# Cursor integration prompt

```text
Integrate the revised Drivers Voice page content from this archive into my existing Next.js repository.

The archive is a partial App Router source tree, not a complete runnable project. First locate app/ or src/app/ in the repository and compare with its current files. Merge the revisions; preserve newer features, existing illustration integration and unrelated work. Do not replace the full repository with this ZIP or overwrite a newer file blindly.

Read DRIVERS-VOICE-REVIEW.md before editing. Its findings are not a legal compliance certificate.

1. Merge the 33 revised page.tsx files and the root layout's description import. Include _forum-copy.ts at the root of the app directory so the relative imports work. It provides original shared editorial copy without requiring edits to a missing lib/copy file. The homepage intentionally still imports FEATURES from the existing lib/copy; preserve that implementation and verify its text does not overpromise privacy, discussion or outcomes.

2. Keep all existing images, image captions, layout refinements, forms, session checks, database calls and permissions. On admin/actions and admin/process-tracker, integrate the added introductions around the existing form components. Do not create duplicate main landmarks or h1 headings; the form components were not available for inspection. Make one clear page title when composing those screens.

3. Ensure SiteHeader, SiteFooter, authentication emails, page metadata, cards and any other shared text consistently describe an independent driver forum. Suggested footer:
“Drivers Voice is an independent driver-led forum. It is not operated by, endorsed by or authorised to speak for Go-Ahead Ireland, SIPTU or the Workplace Relations Commission.”
Do not imitate company branding or reuse its images, logos or website copy. Keep company links clearly external and informational. Route passenger queries to the official company website rather than these driver forms.

4. Replace user-visible “Verified fact” / generic “Verified” labels for source review with “Source checked” where appropriate. Preserve stored status values and API contracts. Do not change driver eligibility labels merely because source-review terminology changed. Explain that source checking is not a legal finding. Record the actual authenticated reviewer's identity on the server, with the precise point checked, source and limitations.

5. Preserve separation between private concerns and forum discussion. The supplied ZIP does not contain a thread/reply forum. Do not add fictional discussion links or promise features that are not built. If the full project has a discussion area, inspect and integrate its rules separately; do not expose individual reports as threads.

6. Keep collection closed until the actual operator/controller, privacy notice and data-handling arrangements are established and checked. A completed form or two administrative confirmations is not proof of lawfulness. Do not invent lawful bases, retention periods, company permission, union authority, WRC details or a pending case's restrictions. Explain and handle account/invitation/authentication data even while case collection is closed.

7. Provide an actual application-level MFA enrolment/challenge flow for privileged users or accurately show that setup is unavailable. Never tell ordinary users to enter the Supabase dashboard or give them hosting/database project access. This archive changes the misleading text, not the missing MFA implementation.

8. Update dashboard survey messaging to reflect missing, closed and open survey states using the repository's actual schema. Do not fabricate field names. Check whether information requests have a functioning reply workflow; if absent, implement with existing authorised server patterns or remove any claim that a reply has been submitted.

9. Add a publication review requirement for personal allegations and any dispute-related content. A member-only audience or submitter consent does not override confidentiality restrictions or other people's rights. Avoid automatic public summaries from case records. Agreement provenance is needed before a priority is published as adopted; inspect publishPriorityAction and its data model rather than relying on the button label.

10. Complete privacy notice requirements using actual decisions and configuration. Preserve restricted operational security procedures and detailed DPIA records in administration; do not reintroduce their raw fields on public pages. Check rights-request routes, recipients, retention, transfers, consent withdrawal where relevant and any automated decision information. Do not make unsupported anonymous, privileged or absolute-confidentiality claims.

11. Moderator rules must permit respectful criticism and legitimate concerns. Do not use content moderation to block lawful reporting, union activity, advice-seeking or employment rights. Record moderation reasons and offer an appropriate correction/review process. Do not promise statutory protected-disclosure protection for generic forum posts.

12. Preserve the official-reporting and deadline reminders. Do not implement a generic legal deadline calculator or imply a forum report notifies the employer, SIPTU, WRC or emergency services.

13. Validate in the full repository: TypeScript, linting, production build and representative mobile/desktop rendering. Test server and database authorisation for driver-to-driver isolation, reviewer assignment, publishing, admin roles, source records, survey responses, exports and private downloads. Demonstrate results with test accounts and fictional data only.

14. Report checks actually run, failures, missing configuration and remaining decisions. Do not assert that the website complies with employment law, GDPR or a specific WRC process based on a code build, a disclaimer or this review. Do not send correspondence, publish content or deploy as part of this content-integration task.
```
