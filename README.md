# Voyage Uganda — live Firebase + Cloudinary platform

SafariBookings / TripAdvisor / GetYourGuide-style front end connected to **Firebase Auth + Firestore** and **Cloudinary**.

## Credentials (in `js/config.js`)
- Firebase project: `chichi-811d8`
- Cloudinary cloud: `ziudh5iv`, preset: `chichi_gallery`

## Firebase Console setup (required)
1. **Authentication** → enable **Email/Password** and **Google**
2. **Firestore** → create database; paste rules from `firestore.rules.example`
3. Create your admin user (register via client or supplier form), then in Firestore:
   - Collection `users` → document `{yourUid}` → field `role` = `"admin"`
4. **Authorized domains** → add your hosting domain (and `localhost` for local tests)
5. Cloudinary: ensure unsigned preset `chichi_gallery` allows uploads to folders under `chichi/`

## How the platform works
| Role | Can view packages | Can book | Can upload itineraries | Can approve |
|------|-------------------|----------|------------------------|-------------|
| Guest | Yes (approved only) | No → login | No | No |
| Client | Yes | Yes | No | No |
| Supplier (unpaid) | Yes | — | **No** | No |
| Supplier (active annual USD sub) | Yes | — | **Yes** (pending review) | No |
| Admin | Yes | — | Yes | **Yes** + activate subscriptions |

## Supplier billing
- Plans: $199 / $399 / $699 **per year (USD)**
- Supplier requests plan → pays official company account → **Admin activates** 12 months in dashboard

## Pages
- `index.html` — budget scroll rows from Firestore
- `itineraries.html` / `itinerary-detail.html` — catalogue + reviews
- `itinerary-editor.html` — Cloudinary images + subscription gate
- `supplier-subscription.html` / `create-supplier-account.html` / `Login.html`
- `client-login.html` / `client-account.html` — email + Google
- `admin-dashboard.html` — approve itineraries, activate subscriptions

## Local test
Serve the folder over HTTP (modules need a server), e.g.:
```bash
npx serve .
```
Open the URL shown (not `file://`).

## Collections
`users`, `suppliers`, `itineraries`, `reviews`, `subscription_requests`
