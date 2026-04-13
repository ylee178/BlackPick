# Facebook OAuth setup — BlackPick

Step-by-step guide to enabling "Continue with Facebook" on the `/login` page. The app code is already wired (see `src/components/auth/SocialAuthButtons.tsx:48,69-75`) — enabling Facebook login is a config-only task across three systems: Meta (Facebook for Developers console), Supabase (Auth provider), and Vercel (client-side env flag).

**Estimated time**: ~45 minutes of active work + 1–3 business days waiting for Meta App Review (for the `public_profile` + `email` permissions).

**Current state**: Google OAuth is live. Facebook button is hidden behind `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN` env var (read in `SocialAuthButtons.tsx:70`). The test file `SocialAuthButtons.test.tsx:75` already exercises the `provider: "facebook"` code path so the client-side contract is locked. All 7 locales have `auth.facebookLogin` localized.

**What unlocks when done**: Korean users who prefer Facebook over Google can sign up. Meta estimates Facebook still has ~30%+ daily-active penetration among Korean 20–40s, so this is a meaningful conversion lift.

---

## Prerequisites

- Meta / Facebook personal account (any will do — this is used to log into the Facebook for Developers console as the app admin).
- Supabase Dashboard admin access on both the PROD project (`nxjwthpydynoecrvggih`) and DEV project (`lqyzivuxznybmlnlexmq`).
- Vercel Dashboard admin access on the BlackPick project.
- A Facebook business / personal page (any Facebook page works — Meta requires one for App Review submission, not for app creation).
- A working `/login` flow on Google OAuth (to verify the baseline still works after the Facebook changes — Google is the regression canary).

---

## Step 1 — Create the Meta app (5 min)

1. Open [developers.facebook.com/apps](https://developers.facebook.com/apps/) and sign in with your Meta account.
2. Click **Create App** (top right).
3. **Use case**: pick **"Authenticate and request data from users with Facebook Login"**. This scopes the app to login only, not Marketing / Messenger / WhatsApp (which would trigger heavier review requirements we don't need).
4. **App name**: `Black Pick` (exactly this, title case — it appears in the Facebook consent screen users see).
5. **App contact email**: your real email (Meta sends security notices here).
6. **Business portfolio**: either "No business portfolio" or attach an existing one. BlackPick doesn't have a business portfolio and doesn't need one for a consumer login app.
7. Click **Create app**. You'll be redirected to the new app's dashboard at `developers.facebook.com/apps/<app_id>/`.

**Note the App ID** (shown at the top of the dashboard, 15–16 digit number). You'll need it in Step 3.

---

## Step 2 — Configure Facebook Login product (10 min)

1. Still in the app dashboard, left sidebar → **Products** → **Facebook Login** → **Settings** (or **Add a product** → **Facebook Login** if it's not already added).
2. **Client OAuth settings**:
   - **Client OAuth Login**: **Yes** (enable).
   - **Web OAuth Login**: **Yes** (enable).
   - **Force Web OAuth Reauthentication**: **No** (default).
   - **Use Strict Mode for redirect URIs**: **Yes** (enable — prevents open-redirect attacks).
   - **Login from Devices**: **No** (default; not needed for web).
3. **Valid OAuth Redirect URIs** — add these exact strings one per line (Meta accepts multiples). The redirect URI is where Facebook sends the user after they consent. Supabase handles the callback, not BlackPick directly.

   ```
   https://nxjwthpydynoecrvggih.supabase.co/auth/v1/callback
   https://lqyzivuxznybmlnlexmq.supabase.co/auth/v1/callback
   ```

   The first is PROD (`nxjwthpydynoecrvggih`), the second is DEV (`lqyzivuxznybmlnlexmq`). Both must be registered because Meta rejects any redirect whose URI isn't in the exact list. Project refs are verified against `CURRENT_STATE.md §OAuth Clients` — cross-check if you're doing this in a future session where the refs may have been rotated.

4. **Deauthorize Callback URL**: leave blank (Supabase handles deauthorization internally).
5. **Data Deletion Requests URL**: `https://blackpick.io/api/auth/data-deletion` — this is a legal requirement Meta adds. **This endpoint does not exist yet** in BlackPick. Options:
   - (a) Leave the field blank — Meta will accept this but flag the app during review. They'll require a URL before App Review approval.
   - (b) Use a placeholder public GitHub gist or Google Doc explaining the deletion policy. Meta accepts a plain URL with a text explanation during review.
   - (c) Implement the endpoint: a new `src/app/api/auth/data-deletion/route.ts` that accepts a POST with a `signed_request` parameter, verifies the HMAC with the app secret, and queues a user deletion. Non-trivial work (~2 hours).
   - **Recommended**: option (b) for the first review submission. Create a gist titled "Black Pick — Facebook User Data Deletion Policy" with 1 paragraph explaining that deletion requests can be emailed to `hello@blackpick.io` (or whichever contact address), and users can also delete their account from the profile page directly. Link the gist URL here. Meta review will accept this.
6. Click **Save Changes** at the bottom.

---

## Step 3 — Retrieve App Secret + copy into Supabase (5 min)

1. In the Meta app dashboard, left sidebar → **Settings** → **Basic**.
2. Find the **App Secret** field — click **Show**. Enter your Meta account password when prompted. Copy the revealed 32-character hex string.

   **DO NOT COMMIT THIS SECRET ANYWHERE.** It belongs only in the Supabase Auth provider config. Not in `.env.local`, not in `.env`, not in the repo, not in a Slack DM.

3. Also on the same page, copy the **App ID** (visible at the top, same as the value you noted in Step 1).

4. Open Supabase Dashboard → PROD project (`nxjwthpydynoecrvggih`) → **Authentication** → **Providers** → **Facebook**.
5. Toggle **Facebook enabled** ON.
6. Paste:
   - **Facebook client ID** = Meta App ID from Step 1
   - **Facebook secret** = Meta App Secret from Step 3.2
7. **Skip nonce check**: leave OFF (default). Supabase handles nonces correctly for Facebook.
8. **Callback URL (for OAuth)**: this is read-only, should show `https://nxjwthpydynoecrvggih.supabase.co/auth/v1/callback`. Verify it matches what you added to Meta in Step 2.3.
9. Click **Save**.

10. **Repeat steps 4–9 for the DEV Supabase project** (`lqyzivuxznybmlnlexmq`). Same App ID + App Secret (you can reuse the same Meta app for both environments — Meta doesn't require separate apps, and the Strict Redirect URI setting keeps DEV and PROD isolated).

---

## Step 4 — Meta App Review submission (waiting: 1–3 business days)

A new Meta app starts in **Development Mode**, which means only the app admins and test users can use Facebook Login. To open it to real users, you need App Review approval for the `public_profile` and `email` permissions.

1. Meta app dashboard → left sidebar → **App Review** → **Permissions and Features**.
2. Find **public_profile** in the list → click **Request Advanced Access**.
3. Fill in the form:
   - **Why does your app need this permission?**: `BlackPick is a fight prediction platform where users sign up with Facebook to track their prediction history, earn points, and compete on leaderboards. We need public_profile to display the user's name and profile photo next to their predictions.`
   - **How are you testing this?**: `We test on our staging environment at https://dev.blackpick.io/login — the Facebook button triggers the full OAuth flow and lands the user on their profile page with their Facebook profile details populated.`
   - **Screencast URL**: you'll need to record a 30-60s Loom (or similar) of the full Facebook login flow on the staging deploy. Upload to Loom/YouTube unlisted, paste the URL. See the "Screencast requirements" box on the Meta page for the exact checklist — typically: show the login page, click "Continue with Facebook", show the Facebook consent screen, show the landing after consent.
4. Repeat for **email** permission — same justification + same screencast can be reused.
5. **Submit for review**.
6. Meta typically responds within 1–3 business days. You'll get an email. If approved, both permissions flip to "Granted" and you can proceed to Step 5. If rejected, Meta gives specific feedback — usually about the screencast quality or the justification — and you iterate.

**Note**: The Facebook login flow WILL work in Development Mode (for you as admin, and for any Meta accounts you add as "test users" under **Roles** → **Roles**), so you can smoke-test the integration before submitting App Review. Just don't flip the Vercel env flag (Step 5) until review is approved — users who aren't admins/testers will hit a "This app is not live" error.

---

## Step 5 — Flip the Vercel env flag + redeploy (3 min)

Once Meta App Review approves the permissions:

1. Vercel Dashboard → BlackPick project → **Settings** → **Environment Variables**.
2. Click **Add New**.
3. **Key**: `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN`
4. **Value**: `true`
5. **Environment**: check all three (Production, Preview, Development).
6. Click **Save**.
7. Trigger a redeploy. The var is baked into the client bundle at **build time** (it's a `NEXT_PUBLIC_*` var), so just changing it in the dashboard is not enough — you need a new build:
   - Option A: push an empty commit to `develop` or `main` and let GitHub Actions deploy.
   - Option B: in the Vercel dashboard, find the latest deployment → **Redeploy** → uncheck "Use existing Build Cache" → Redeploy.

---

## Step 6 — Smoke test (5 min)

1. Open `https://blackpick.io/en/login` (or `/ko/login`) in an **incognito browser window** (to avoid caching).
2. Verify the "Continue with Facebook" button is visible alongside "Continue with Google". If missing, the env flag didn't take effect — check the Vercel build log for `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN` in the output.
3. Click **Continue with Facebook**.
4. Verify the Facebook consent screen appears (looks like: "Black Pick will receive your public profile and email address").
5. Click **Continue as <your name>**.
6. Verify you land on the BlackPick home page or profile page with your session active (avatar in top-right corner).
7. Verify the user was created in Supabase: Dashboard → **Authentication** → **Users** → find your email → **Provider** column should say `facebook`.
8. Open `scripts/smoke-prod.mjs` and un-comment the Facebook assertion at line 77-79 (it's currently commented out pending this flow being live):
   ```js
   assert(
     r.body.includes("Continue with Facebook"),
     "login page missing 'Continue with Facebook' — check the env flag",
   );
   ```
   This locks the button presence in as a regression check for future deploys.
9. Commit the `smoke-prod.mjs` edit + push. Next `npm run smoke:prod` run will assert Facebook button presence.

---

## Rollback plan

If something breaks after Step 5 (users report Facebook login errors, Supabase dashboard shows provider errors):

1. **Fastest**: Vercel → Environment Variables → set `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN` to `false` (or delete it) → redeploy. The Facebook button disappears from the UI; users who had already linked Facebook can still sign in via Google, and existing sessions remain valid. This is a 3-minute rollback.
2. **If Supabase provider is broken**: Supabase Dashboard → Authentication → Providers → Facebook → toggle off → Save. This disables the provider server-side regardless of whether the UI button is hidden. Users with existing Facebook-linked accounts will lose the ability to sign in (they should re-link via Google).
3. **If Meta app is compromised** (app secret leaked, unauthorized access): Meta app dashboard → Settings → Basic → **Reset App Secret** → copy the new secret → update both Supabase projects (PROD + DEV) immediately with the new secret. Every active Facebook session is invalidated.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Button missing on `/login` after redeploy | `NEXT_PUBLIC_ENABLE_FACEBOOK_LOGIN` not built into client bundle | Verify Vercel env var is set for the current environment (Production vs Preview matters) + redeploy with "no build cache" |
| "URL blocked: This redirect failed..." on consent screen | Meta rejected the redirect URI | Double-check Step 2.3 — the Supabase callback URL in the Meta OAuth redirect list must match the Supabase project ref exactly |
| "App not active" error when non-admin users try to log in | Meta App Review not approved yet, or the app is still in Development Mode | Either complete Step 4, or add the user as a test user under **Roles** → **Roles** |
| User gets logged in but profile avatar is missing | Supabase isn't pulling the Facebook avatar URL into `user_metadata.avatar_url` | Check Supabase → Authentication → Providers → Facebook → ensure "Return profile picture" (or equivalent scope) is enabled |
| Google OAuth breaks after adding Facebook | Unlikely but worth checking — the `queryParams` for Google vs Facebook are handled differently in `SocialAuthButtons.tsx:99-108` | Run `npm run test:fast` — the `SocialAuthButtons.test.tsx` suite exercises both providers and would catch this |

---

## Related files

- `src/components/auth/SocialAuthButtons.tsx` — client-side button rendering + `signInWithOAuth` call.
- `src/components/auth/SocialAuthButtons.test.tsx` — unit tests for both Google and Facebook provider paths (already passing with the current code).
- `src/lib/auth/oauth-redirect.ts` — callback URL builder (enforces no-open-redirect, no-double-locale-prefix).
- `scripts/smoke-prod.mjs:67-80` — login page smoke check (has commented-out Facebook assertion ready to un-comment after Step 6).
- `src/messages/{en,ko,ja,zh-CN,mn,es,pt-BR}.json` — `auth.facebookLogin` key already translated in all 7 locales.
