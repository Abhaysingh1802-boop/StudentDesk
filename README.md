
# CampusDesk (StudentDesk)

A campus resource booking platform. Students book shared resources — halls,
rooms, equipment — for a time slot; admins manage the resource catalog,
bookings, and user roles.

Live: https://abhhunt.in

## Tech stack

- **Backend:** Node.js, Express 5, MongoDB (Mongoose)
- **Auth:** Passwordless — email OTP + JWT stored in an httpOnly cookie
- **Email:** Resend (OTP codes, booking reminders)
- **Frontend:** Vanilla HTML/CSS/JS (no build step, no framework)
- **Hosting:** Render (backend + static files), MongoDB Atlas (database)

## How authentication works

There are no passwords. Flow:

1. User enters their email on `index.html` → `POST /sendotp` emails a 6-digit
   code via Resend and stores it in the `Otp` collection.
2. User enters the code:
   - New user → `POST /signup` (name, email, otp) creates the `User` and
     signs them in.
   - Returning user → `POST /login` (email, otp) signs them in.
3. On success the server signs a JWT (`{ id, role }`, 24h expiry) and sets it
   as an httpOnly cookie named `token`. The OTP record is deleted once used.
4. Every protected route runs the `auth` middleware, which reads that cookie
   and attaches `req.user`. Admin-only routes add `adminOnly` on top.
5. `index.html` redirects to `adminportal.html` or `userdashboard.html`
   depending on `user.role`.
6. `POST /logout` clears the cookie.

## Roles

- **student** (default) — books resources, manages their own bookings.
- **admin** — everything a student can do, plus resource CRUD, booking
  oversight, and user role management. Admins can't demote themselves (a
  guard in `PATCH /users/:id` blocks removing your own admin access).

## Pages

| File | Who | What it does |
|---|---|---|
| `index.html` | everyone | OTP-based sign up / log in, redirects by role |
| `userdashboard.html` | students | stats, upcoming bookings, reminders, resource browser, booking flow, profile/logout menu |
| `adminportal.html` | admins | dashboard stats, resource CRUD, recent bookings widget, profile/logout menu |
| `bookings.html` | admins | full booking list — search, filter by status, cancel |
| `users.html` | admins | list of registered users, role changes (user ↔ admin) with a confirm modal |

### Student dashboard features

- Live stats: upcoming bookings, resources available today, next reminder,
  total bookings all-time
- **Book a resource**: pick resource → date → time, availability checked
  live against existing bookings and the resource's open/close hours,
  conflicts and out-of-hours slots are rejected server-side
- Resource browser with search + category filter (hall / room / equipment),
  each card shows open/closed status computed from current time
- "My Bookings" panel — view everything, cancel a confirmed booking
- **Notification bell** — dropdown of upcoming bookings with a live
  "in Xh Ym" countdown, badge shows the count
- Profile dropdown — view profile, jump to bookings, log out (confirm modal)

### Admin portal features

- Dashboard stats: total resources, total bookings, today's bookings,
  active users
- Resource CRUD: add / edit / delete, search + category filter, pagination
- Recent bookings widget with a per-row menu (view in full list / cancel)
- Bookings page (`bookings.html`): search, status filter, cancel
- Users page (`users.html`): role management with confirm-before-apply and
  toast notifications, self-demotion blocked, XSS-safe rendering
- Profile dropdown + logout, same pattern as the student dashboard

## Background jobs

Two schedulers start when the server boots (`server.js` → `startServer()`):

- **`reminders.js`** — every 5 minutes, finds confirmed bookings starting in
  the next 45–60 minutes and emails the user via Resend. A `ReminderLog`
  collection (separate from `Booking`) guarantees each booking gets exactly
  one reminder.
- **`cleanup.js`** — once a day, deletes any `Booking` document whose date
  is more than 7 days in the past. Keeps the collection from growing forever
  with stale history.

## Backend routes

Grouped by file, mounted in `server.js`.

**`signup.js`** — auth
- `POST /sendotp` — email + send OTP
- `POST /verifyOtp` — check an OTP without consuming the signup/login flow
- `POST /signup` — create account (name, email, otp)
- `POST /login` — sign in (email, otp)
- `GET /me` — current user from the JWT cookie
- `POST /logout` — clear the auth cookie

**`booking.js`** — student-facing booking
- `GET /catalog/resources` — active resources, searchable/filterable
- `GET /resources/:id/availability?date=` — a resource's existing bookings
  for a given date
- `POST /bookings` — create a booking (validates time range, resource hours,
  conflicts, and that the slot is in the future)
- `GET /bookings/me?status=` — the current user's bookings
- `PATCH /bookings/:id/cancel` — cancel your own confirmed booking
- `GET /dashboard` — student dashboard summary (resource count, upcoming,
  total bookings)

**`admin.js`** — admin-only (all routes require `auth` + `adminOnly`)
- `POST /AddResource`, `PATCH /resource/:id`, `DELETE /delete/:id`
- `GET /resources` — searchable/filterable resource list
- `GET /admin/dashboard` — admin stats + recent bookings
- `GET /admin/bookings` — full booking list
- `PATCH /admin/bookings/:id/cancel` — cancel any booking
- `GET /AllUsers` — list users
- `PATCH /users/:id` — change a user's role (`user` ↔ `admin`)

**`book.js`** — legacy/utility
- `GET /Resource/data/:date` — resources created on a given date (older
  route, largely superseded by `catalog/resources`)

## Data model (implied by usage)

- **User**: `name`, `email`, `role` (`student` default / `admin`),
  `createdAt`
- **Resource**: `name`, `category` (`hall`/`room`/`equipment`/`other`),
  `description`, `location`, `openTime`, `closeTime`, `isActive`,
  optional `capacity`, `createdAt`
- **Booking**: `user` (ref), `resource` (ref), `date` (`YYYY-MM-DD` string),
  `startTime`, `endTime`, `purpose`, `status` (`confirmed`/`cancelled`),
  `createdAt`
- **Otp**: `email`, `otp`, `createdAt` — one live OTP per email
- **ReminderLog**: `booking` (unique ref), `sentAt` — dedupes reminder emails

## Environment variables

Set these in `.env` (see `.gitignore` — never commit it):

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Signs the auth cookie |
| `RESEND_API_KEY` | Sends OTP + reminder emails via Resend |
| `RESEND_FROM_EMAIL` | Optional, defaults to `StudentDesk <otp@abhhunt.in>` |
| `NODE_ENV` | `production` enables `secure` cookies |
| `PORT` | Optional, defaults to `3000` |

