# CHIC Connect — Setup Guide

This turns the original static demo into a real Supabase-backed application:
public site with live doctor data + real appointment booking, an authenticated
admin panel, and server-side email notifications.

## Project structure

```
/index.html                              Public site (design unchanged)
/admin.html                              Admin login + dashboard
/css/styles.css                          All styling (extracted from the original inline <style>)
/js/config.example.js                    Template — copy to config.js
/js/config.js                            YOUR Supabase URL + anon key (gitignored)
/js/supabase-client.js                   Shared Supabase client
/js/specialty-styles.js                  Icon/color lookup per medical specialty
/js/doctors.js                           Fetches + renders the public doctor directory
/js/booking.js                           Booking modal, now inserts into Supabase
/js/profile.js                           "View Profile" modal
/js/services.js                          "Learn More" service detail modal
/js/tracker.js                           Appointment tracker (calls a secure RPC)
/js/print-slip.js                        Shared printable appointment slip
/js/main.js                              Wires up the public site
/js/admin-app.js                         Admin auth + doctors/appointments CRUD
/supabase/migrations/0001_init.sql       Full DB schema, RLS, triggers, seed data
/supabase/functions/send-appointment-email/index.ts   Edge Function for email
```

Nothing else changed — same colors, fonts, layout, and copy as the original file.

---

## 1. Create a Supabase project

1. Go to https://supabase.com/dashboard and create a new project (or use an existing one).
2. Note down, from **Project Settings → API**:
   - **Project URL** (e.g. `https://abcxyz.supabase.co`)
   - **anon / public key**
   - **service_role key** (needed only for the Edge Function secret — never put this in frontend code)

## 2. Run the database migration

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the entire contents of `supabase/migrations/0001_init.sql` and run it.
   - This creates the `doctors`, `appointments`, and `admin_users` tables, all indexes, RLS policies, the reference-number trigger, the `track_appointment` RPC, and seeds your 12 existing doctors (with placeholder `@example.com` emails — edit these in the admin panel afterwards).
3. If you're using the Supabase CLI instead: `supabase db push` with this repo's `supabase/` folder.

## 3. Configure the frontend

```bash
cp js/config.example.js js/config.js
```

Edit `js/config.js` and set:
```js
export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-PUBLIC-ANON-KEY';
```

The anon key is meant to be public — it's safe in browser code as long as RLS
is correctly configured, which the migration above already does. **Never**
put the `service_role` key here.

> **Note on "environment variables" for a static site:** plain HTML/CSS/JS has
> no build step, so there's no real server-side env-var injection at request
> time. `js/config.js` is the practical equivalent: it's git-ignored (see
> `.gitignore`) so it's never committed, and each environment (your laptop,
> staging, production) gets its own copy with its own values. If you later
> add a build step (Vite, Netlify, Vercel, GitHub Actions, etc.), you can
> instead generate this exact file from real `SUPABASE_URL` / `SUPABASE_ANON_KEY`
> environment variables at build/deploy time — the app code doesn't change either way.

## 4. Create your first admin account

Admin access requires **two** things: a Supabase Auth user, AND a matching row
in `admin_users`. Creating just the auth user is not enough — this is what
stops random sign-ups from getting admin rights.

1. In Supabase Dashboard → **Authentication → Users**, click **Add user** and create an account with an email + password (or invite via email).
2. Copy that user's UUID from the users list.
3. In **SQL Editor**, run:
   ```sql
   insert into public.admin_users (user_id, full_name)
   values ('PASTE-THE-USER-UUID-HERE', 'Your Name');
   ```
4. Go to `admin.html` on your deployed/local site and sign in with that email + password.

## 5. Deploy the Edge Function (appointment email)

You'll need the [Supabase CLI](https://supabase.com/docs/guides/cli) and a
[Resend](https://resend.com) account (free tier is enough to start) — Resend
is a straightforward transactional email API that works well with Edge
Functions. You can swap in another provider by editing the `fetch()` call in
`supabase/functions/send-appointment-email/index.ts`.

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF

# Secrets — none of these are ever exposed to the browser
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set NOTIFY_EMAIL=chicnlr90@gmail.com
supabase secrets set NOTIFY_FROM_EMAIL=appointments@yourdomain.com

supabase functions deploy send-appointment-email
```

Notes:
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to every Edge Function by the platform — you don't set those yourself.
- `NOTIFY_FROM_EMAIL` must be on a domain you've verified in Resend. Until you verify a domain, Resend's shared `onboarding@resend.dev` sender works for testing (it's the default if you skip this secret).
- If `RESEND_API_KEY` isn't set yet, the function still runs successfully — it saves the appointment, marks `email_sent = false` with an explanatory `email_error`, and does **not** throw an error back to the patient. Nothing is ever silently lost.

### Optional but recommended: Database Webhook as a backup trigger

Right now the browser calls the Edge Function immediately after inserting an
appointment (`js/booking.js`). That covers the normal case, but if the
patient's browser closes or loses connection right after a successful insert,
the email call might never fire. For extra reliability, add a **Database
Webhook** (Dashboard → Database → Webhooks) on `INSERT` to `public.appointments`
pointing at your deployed function's URL — the function already accepts both
call shapes, so no code changes are needed.

## 6. Run the site locally

Because the JS uses ES modules (`type="module"`), open it through a local
server rather than double-clicking the file:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then visit `http://localhost:8000/index.html` and `http://localhost:8000/admin.html`.

## 7. Test the booking flow end-to-end

1. On the public site, click any **Book Appointment** button.
2. Complete all steps (specialty → doctor → date/time → your details → review).
3. Confirm — you should see a reference number like `CHIC-2026-000001`.
4. In Supabase Dashboard → **Table Editor → appointments**, confirm the row exists with `status = Request Received`.
5. Check `email_sent` — `true` means Resend accepted it; check the inbox at your `NOTIFY_EMAIL` address.
6. In `admin.html`, sign in and confirm the request appears under the **Appointments** tab; try changing its status.
7. On the public site, use **"Track your appointment status"** with the reference number and the phone number you entered — you'll be prompted for the phone number for privacy, since a reference alone shouldn't be enough to see someone else's appointment.

## 8. Verify doctor management

1. In `admin.html` → **Doctors** tab, click **+ Add Doctor**, fill in the form, save.
2. Refresh the public site's Doctors section — the new doctor should appear (grouped under Visiting/Local automatically based on the type you chose).
3. Click **Deactivate** on a doctor — refresh the public site, confirm they disappear from the directory (they aren't deleted, just hidden — RLS enforces this, not just the UI).

---

## Security summary (what's already handled)

- **No service-role key in frontend code** — only the anon key, which is safe by design once RLS is on.
- **RLS on every table**: patients can only *insert* appointments (not read them back); only rows in `admin_users` unlock read/write access to doctors and appointments.
- **Admin status is never client-controlled** — it's enforced server-side via the `is_admin()` Postgres function checked inside every policy, not a flag trusted from the browser.
- **Appointment lookup by patients** goes through a `security definer` RPC (`track_appointment`) that requires matching both the reference number *and* phone number, rather than opening broad read access.
- **Email secrets live only in Supabase Edge Function secrets**, never in git or client code.
- **Failed email delivery never loses an appointment** — the insert and the email send are separate steps, and failure is recorded (`email_error`) rather than hidden.

## What's still on you

- Replace the seeded placeholder doctor emails (`*@example.com`) with real ones via the admin panel.
- Verify a sending domain in Resend (or swap providers) for production email deliverability.
- Decide whether to add the optional Database Webhook described above.
- This app has not been deployed anywhere by me — you'll need to host these static files yourself (Netlify, Vercel, GitHub Pages, your own server, etc.). I don't have a live Supabase project connected to this conversation, so nothing here has actually been tested against a real database — please run through Section 7 and 8 yourself after setup.
