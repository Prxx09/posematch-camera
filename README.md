# PoseMatch

Native Android/iOS Expo camera app. Select a curated photo or private on-device reference, drag/resize/mirror its translucent overlay, capture a clean photo, and save/share it. Includes reference-versus-result comparison export. No AI, scoring, nudges, vibration, or automatic capture.

## Run on a phone

Requires Node 24 and an Expo SDK 57-compatible Expo Go or development build.

1. Extract this folder and run `npm ci`.
2. Copy `.env.example` to `.env.local`. It contains this project's URL and a public publishable key, not an administrator credential.
3. Run `npx expo start`.
4. Open the QR code using Expo Go on a physical phone on the same network.
5. Select **My poses → Add a reference photo** to test immediately. The curated cloud catalog starts empty.

Windows PowerShell: `Copy-Item .env.example .env.local`.

This MVP targets native Android/iOS, not browser deployment. No Python server or localhost backend is required.

## Supabase backend

Configured project: `qvkjofiuwblhmkguaxcz`.

- Table: `public.poses`, with row-level security enabled.
- Public and signed-in clients: SELECT active rows only; no insert/update/delete grants.
- Bucket: `pose-catalog`, public downloads, 10 MiB file limit; JPEG/PNG/WebP only.
- No public upload policies. Maintain catalog from Supabase Dashboard or the admin script.
- No user accounts or personal-image upload endpoint.

The schema has already been applied to the connected project. Do not rerun the migration there. The SQL under `supabase/migrations` is for a new empty project/review; reconcile remote migration history before using CLI pushes against the existing project.

## Populate the public catalog

Only use photos you have permission to redistribute.

Dashboard workflow:
1. Storage → pose-catalog → upload `solo/relaxed.jpg`.
2. Table Editor → poses → insert title, category, image_path = `solo/relaxed.jpg`.
3. Categories: solo, couple, group, pet, airport fit check, mirror selfie.
4. Pull to refresh in the app.

Bulk workflow:
1. Copy `catalog/manifest.example.json` to `catalog/manifest.json`.
2. Put your photos beside it and adjust file paths, titles and categories.
3. Create ignored `.env.admin.local` containing `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from your dashboard.
4. Run `npm run catalog:upload -- catalog/manifest.json`.

Never put an admin/secret/service-role key in an EXPO_PUBLIC variable, mobile source, GitHub, or a chat message. Uploading uses new paths only; existing assets are not overwritten. A failed metadata insert attempts to remove the newly uploaded orphan.

Public bucket URLs remain public even if their metadata row is inactive. Remove the object to revoke its public availability.

## Privacy

Imported references are copied to app-private files and indexed in SQLite. The app never sends them or camera photos to Supabase. Deleting a reference removes the app's copy, not the original gallery photo. Uninstalling clears the local library.

Android app backup is disabled in the standalone build. Expo Go and OS/device backups, especially iOS backup, are outside this app-level no-upload guarantee. For strict no-cloud use, disable device/app backups. Photos explicitly saved to the gallery can sync through the user's iCloud/Google Photos settings; sharing exports to the chosen recipient/app.

## Build an installable app

1. Create/sign in to an Expo account using `npx eas-cli login`.
2. Run `npx eas-cli build:configure` and associate your Expo project.
3. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the EAS environment used by the build.
4. Android APK: `npx eas-cli build --platform android --profile preview`.
5. Store builds: `npx eas-cli build --platform all --profile production`.

EAS account setup, signing credentials, build quotas/billing and store accounts require the owner. No APK or store release has been created here. Choose final app identifiers before store submission.

## Verification

- `npm run typecheck`
- `npm test` — six catalog-input validation tests
- `EXPO_OFFLINE=1 npx expo export --platform android --platform ios` (PowerShell: set the environment variable separately)
- GitHub Actions repeats these checks.

Native bundle export is not an emulator/device test. Before release verify on a physical Android and iPhone:

- Camera allow/deny/settings recovery; background/foreground; front/back camera.
- Overlay drag, opacity, size, mirror and reset.
- Captured framing and orientation (device previews can differ from output).
- Save/share, comparison image load and export; permission denial.
- Import/relaunch/delete a reference; original gallery photo remains.
- Cloud failure/empty catalog and personal-reference operation without internet.
- Network inspection confirms imported images and captures never leave the app.

## Current release limitations

- Curated photos must be supplied; no stock photos were copied without a chosen license.
- Catalog fetch is capped at 500 entries; no offline cloud-image cache or pagination yet.
- Comparison saves on button press, not automatically.
- No web build, app-store deployment, native-device verification or iOS backup exclusion plugin.

## Structure

- App.tsx: app navigation and local database lifecycle.
- src/screens: catalog, private references, manual camera/capture preview.
- src/services: public catalog reads and local-only reference CRUD.
- scripts: trusted admin catalog import/validation.
- supabase/migrations: backend schema/security.
