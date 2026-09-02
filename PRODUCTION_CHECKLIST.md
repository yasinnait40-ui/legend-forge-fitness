# AETHORA production checklist

This checklist contains deployment configuration that cannot be verified from source code. Do not place secret values in this file.

## Supabase Auth

- [ ] Set the production Site URL to the deployed HTTPS origin.
- [ ] Add the deployed origin and `/reset-password` to Supabase Auth redirect URLs.
- [ ] Confirm email verification behavior matches the intended launch policy.
- [ ] Configure production SMTP if account emails must reach users outside the default provider limits.
- [ ] Confirm Google OAuth is enabled and the Google provider callback uses the Supabase project's official callback URL.
- [ ] Test signup, email confirmation, password recovery, logout, refresh, and two separate accounts.

## Environment variables

- [ ] Provide only the public Supabase URL and publishable/anon key to the browser build.
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, and `SUPABASE_JWT_SECRET` server-side and out of client bundles.
- [ ] Provide the Gemini key through the existing server-side configuration; never commit or expose its value.
- [ ] Replace temporary Gemini credentials through deployment environment settings, not source code.

## Application deployment

- [ ] Use a production HTTPS domain.
- [ ] Set the production OAuth and password-reset redirect origins to that exact domain.
- [ ] Review Supabase Auth rate limits and email provider limits.
- [ ] Enable and test Supabase backups/point-in-time recovery according to the selected plan.
- [ ] Add an error monitoring provider only after its privacy and retention settings are reviewed.
- [ ] Publish owner-provided Privacy Policy and Terms details before public launch.

This document is operational guidance, not legal advice or a claim of compliance.
