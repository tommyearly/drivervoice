# Drivers Voice: website and page-content review

Reviewed 1 November 2026 against the supplied pages(1).zip and the sources linked below.

## Main finding

Use Drivers Voice as an independently branded driver discussion and support hub, with approved public updates and restricted individual follow-up. Do not present it as the company's reporting system, a union's negotiating body, an official WRC service or a complete accident database.

The supplied pages have useful safeguards: invitation-based access, separate public/member updates, proposed-role wording, restrictions on automatic publication, a privacy-configuration gate and separate driver/reviewer views. These are visible design intentions. The ZIP does not include the implementation needed to establish that they actually work.

This review cannot certify compliance with employment law, GDPR, a contract, a union agreement or an ongoing dispute's restrictions. A public company website does not establish permission under internal employment policies. Obtain the relevant documents and ask an authorised union representative or Irish employment solicitor about the specific restrictions before publishing dispute material.

## What was actually inspected

- All 33 page.tsx files, their supplied layouts, metadata and supporting route files.
- The newer pages(1).zip has identical file contents to the first pages.zip.
- Go-Ahead Ireland's homepage, About page, policies index, website disclaimer and public privacy material, plus the public health-and-safety policy link.
- WRC guidance on grievance procedures, conciliation, mediation and complaint procedures.
- DPC guidance on lawful processing, sensitive data, transparency and retention.
- OPDC guidance distinguishing grievances from protected disclosures and describing reporting routes.

The passenger-support page did not load reliably. No claim is made to have checked its full current wording. No internal company social-media policy, employee handbook, employment contract, collective agreement, SIPTU rulebook or actual WRC case document was supplied or located in the reviewed public pages. Absence from those pages is not evidence that such documents or restrictions do not exist.

## Company website: practical comparison

| Company material | Implication for Drivers Voice |
| --- | --- |
| Official navigation covers journey planning, fares, customer support, careers and company information. | Make the audience and independent purpose obvious. Passenger enquiries should go to the official company website, not an independent driver-report form. |
| The website disclaimer reserves rights in its content, images, brands and trademarks. | Write original copy and use your original unbranded illustrations. Do not copy company photos, logos, page text or a visual identity that suggests endorsement. A disclaimer does not authorise reuse. |
| Public health-and-safety policies are linked from the policies page. | Preserve the distinction between official safety reporting and optional forum follow-up. Do not imply the forum substitutes for control, engineering, emergency or safety procedures. |
| The company publishes its own privacy policy. | That notice governs its own processing. It does not make the company the controller of your forum or supply your forum's lawful basis. Do not copy it as your notice. |

Using the employer's name to explain who the forum is for is different from presenting the forum as an official service. This is a positioning recommendation, not trademark clearance or a finding that a domain name is legally available.

## Findings and actions

### 1. Check actual employment and dispute restrictions

Check the current employment contract, handbook, confidentiality and social-media rules, IT/device rules, reporting procedures and any relevant collective agreement. Ask the representative handling the dispute which communications or proposals may be circulated and to whom. A forum statement cannot override those obligations. Equally, site rules should not purport to remove lawful employment, union, advice-seeking or reporting rights.

The revised text supports constructive criticism and good-faith concerns. It avoids a blanket ban on discussing the employer, an invented requirement for employer permission, or a promise that no disciplinary risk can arise.

### 2. Identify the actual WRC process

Do not treat every WRC matter as the same process or infer a referral, stage, hearing date or delay. WRC guidance describes confidentiality in conciliation and mediation; the application to particular documents must be checked for the actual process and any commitments made. Do not publish negotiation offers, admissions, settlement material, private correspondence or case identifiers just because they are marked member-only. Portal access is still disclosure to other people.

The tracker should hold minimal verified administrative information. Keep detailed dispute files with the authorised handler. A five-working-day request for an update is a suggested reply date, not a statutory obligation or proof of non-cooperation when missed.

### 3. Do not replace formal reporting or miss deadlines

The WRC code supports understandable, fair grievance procedures and appropriate representation. The forum may help organise a question or account but does not itself lodge a company grievance, accident report or WRC complaint. Forum activity does not extend statutory deadlines. Applicable periods and preliminary steps depend on the type of claim: do not implement one generic legal countdown or promise the committee will protect every claim.

Keep urgent safety concerns, safeguarding, disciplinary matters and detailed accident files out of general forum collection. Provide appropriate route guidance and limited follow-up requests.

### 4. Private handling is not anonymity or legal privilege

Account-based submissions and the survey are identifiable. Removing a name may still leave someone recognisable from a date, route, duty, depot or event. Suppressing groups under five is only one precaution, not a guarantee of anonymity.

Someone must actually determine and document the forum's controller arrangements. The controller must choose an Article 6 basis and an applicable Article 9 condition where special-category information is processed. Health and union membership are special categories. Do not assume that being a driver group makes it a trade union or automatically gives it a trade union's processing basis.

Publish an accurate notice before collection. Address recipients, sources where relevant, rights, complaint routes, retention, transfers and other applicable transparency information. Staff, applicants, invited accounts, authentication and server logs can involve personal data even while concern forms are disabled. A “collection closed” banner does not by itself stop all processing.

### 5. Source checking is not adjudication

The existing “Verified fact” wording is too broad where the forum may only have checked one document or date. Revised display wording uses “Source checked” with an explanation. Existing enum values are preserved for compatibility. Reviewers should record the precise point checked and its limits; do not adjudicate guilt, liability or the merits of an employment case.

No public naming and shaming, pressure over voting or publication of identifying allegations. Avoid indirect identification as well as names. Check necessity and others' rights even if the submitting driver consents to publication. If a formal procedure needs allegations to be put to another person, that belongs in the appropriate authorised process, not a public forum pile-on.

### 6. Protected disclosures need the right route

Do not advertise a generic form as a protected-disclosure channel or promise statutory protection for submissions to it. OPDC guidance distinguishes exclusively personal grievances from potential wrongdoing disclosures and explains that different recipients and wider disclosures have conditions. Route users to appropriate advice and reporting options. Never say a driver must use the company grievance process before every lawful external report.

### 7. A discussion forum has not been implemented in this ZIP

There are no thread, reply, discussion-moderation or thread-reporting routes in these files. “Forum” presently describes a driver hub with forms, surveys, updates and an action tracker. The new text avoids promising open discussion threads that do not exist. If threads are added, default to verified-driver access, clear rules and moderation. Individual case reports must remain separate from discussions. Logged-in discussion posts are not confidential legal communications.

### 8. Fix misleading account guidance and public operational details

The Account page originally told privileged users to enrol MFA in Supabase project settings. End users need an application authentication-factor flow, not hosting/database project access. The revised text removes that instruction, but the actual enrolment UI still needs implementation or verification in the full repository.

The public privacy page originally rendered the complete breach-response procedure and DPIA assessment fields. Revised copy does not expose those raw internal fields. Keep appropriate high-level transparency while storing detailed security procedures and assessment material in restricted administration.

## Source-code limitations requiring full-project review

The ZIP lacks package.json, dependencies, components, lib/copy, repository implementations, server/actions, authentication helpers, database migrations and RLS/storage policies. Therefore:

- A full Next.js build, type check, runtime rendering or security test cannot be completed from these files alone.
- Layout checks and disabled buttons cannot establish server-side authorisation or database isolation.
- Check that “verified drivers” only describes the actual eligibility process and that privileged roles are assigned and audited correctly.
- Source-reviewer identity should be derived from the authenticated actor, not trusted from a typed name.
- Test private-record separation, direct URLs, mutations, downloads, invitations, exports and email contents.
- Confirm that no public summary or action exposes private identifiers, drafts or internal notes.
- Confirm that the privacy gate includes a published complete notice and the real configuration, not merely non-empty fields or two clicks.
- Survey state may be missing or closed; the dashboard must not imply every account has an open survey. Prefer factual state-aware messaging in the full project.
- The existing report detail's Requests section shows requests and a correction/closure form; it does not visibly provide a dedicated information-request reply form. Do not claim replies are fully supported without checking the missing components/actions.
- Existing action/process form components were not included. The revised pages add explanatory text only; inspect those components for their own headings and main landmarks during integration.

## Changes in the supplied revision

- Original plain-language editorial copy in a new app-local _forum-copy.ts file; existing business data and enum keys remain intact.
- Clearer explanation on every one of the 33 pages, including concise guidance on admin screens.
- More explicit independence and voluntary-participation wording.
- Safer distinction between source checks, accounts, proposals and legal findings.
- Minimal incident-follow-up guidance, formal-route reminders and deadline warning.
- Privacy-rights explanation and DPC link; no invented controller, retention period or legal basis.
- Conduct rules preserve lawful reporting and representation while setting participation standards.
- Inappropriate Supabase account guidance removed; source-review UI terminology clarified.
- Root metadata description uses the revised forum description.

No external correspondence, publication or deployment was performed. The revisions do not change underlying authentication, data queries, action signatures, role values, status enums or collection gates.

## Sources checked

1. [Go-Ahead Ireland official website](https://www.goaheadireland.ie/)
2. [Go-Ahead Ireland About](https://www.goaheadireland.ie/about-us)
3. [Go-Ahead Ireland website disclaimer](https://www.goaheadireland.ie/terms-and-conditions)
4. [Go-Ahead Ireland policies](https://www.goaheadireland.ie/policies)
5. [Go-Ahead Ireland privacy policy](https://www.goaheadireland.ie/privacy-policy)
6. [Go-Ahead Ireland public health-and-safety policy index](https://www.goaheadireland.ie/business-policies)
7. [WRC Code of Practice on Grievance and Disciplinary Procedures](https://www.workplacerelations.ie/en/what_you_should_know/codes_practice/cop3/)
8. [WRC conciliation](https://www.workplacerelations.ie/en/complaints_disputes/conciliation/)
9. [WRC mediation](https://www.workplacerelations.ie/en/complaints_disputes/mediation/)
10. [WRC complaint and dispute procedures](https://www.workplacerelations.ie/en/publications_forms/procedures_employment_and_equality_complaints.pdf)
11. [DPC lawful processing](https://dataprotection.ie/en/organisations/know-your-obligations/lawful-processing)
12. [DPC special-category data](https://www.dataprotection.ie/en/organisations/know-your-obligations/lawful-processing/special-category-data)
13. [DPC transparency and privacy notices](https://www.dataprotection.ie/en/individuals/know-your-rights/right-be-informed-transparency-article-13-14-gdpr)
14. [DPC retention guidance](https://www.dataprotection.ie/en/faqs/responsibilities-data-controllers/how-long-should-personal-data-be-held-meet-obligations-imposed-gdpr)
15. [OPDC: what a protected disclosure is](https://opdc.ie/en/publication/3a25c-what-a-protected-disclosure-is/)
16. [OPDC: grievances and protected disclosures](https://opdc.ie/en/publication/b6b0a-information-for-whistleblowers/)

These sources explain general principles. They do not decide the forum's legal position or disclose the terms of an individual employment contract or dispute.


## Validation performed on this archive

- All 33 original page files have revised copy.
- Checked that form action bindings, field names, disabled collection gates, repository-call names and redirect calls are preserved against the original supplied files.
- Checked the new relative shared-copy imports resolve.
- Confirmed unchanged API route files and archive integrity.
- No full build, type check, browser render or database/access-control tests: the complete repository and required dependencies were not supplied. Those remain necessary during integration.
