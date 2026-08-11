# Design notes

## 1. Overlap checks

When a booking is submitted, the server converts the requested `startTime` and
`endTime` into minutes since midnight. It loads the confirmed bookings for the
same resource and date, then rejects the request when this condition is true
for any existing booking:

```js
requestedStart < existingEnd && requestedEnd > existingStart
```

This describes a real intersection between two half-open time intervals:
`[start, end)`. The strict comparisons are important. If one booking ends at
10:00 and the next starts at 10:00, `requestedStart < existingEnd` is false,
so there is no overlap and the back-to-back booking is accepted. The check
only considers `confirmed` bookings, so a cancelled slot becomes available.

## 2. Double-booking race

There is still a small race in the current application. Two requests for the
same resource, date, and time could both read the conflict list before either
one writes its new Booking document. Each request would then see no conflict
and both could create a booking.

For a production system, I would make the read/check/write operation atomic.
Because time ranges cannot be protected by a simple unique MongoDB index, my
preferred solution would be to model a resource's bookable time in fixed slots
(for example, five- or fifteen-minute slots) and insert the required slot
documents in a MongoDB transaction with a unique index on
`resource + date + slot`. A duplicate-key error would mean the slot was just
taken and should be returned as HTTP 409. An alternative is to serialize
booking creation per resource/date with a transactional lock. In either case,
the UI availability request remains helpful feedback, but the database-level
operation is the final authority.

## 3. Login after a hard refresh

On signup or login, the server signs a JWT containing the user's id and role
and puts it in an HTTP-only `token` cookie with a 24-hour lifetime. Since the
cookie is stored by the browser, a hard refresh does not remove it. Dashboard
pages call protected endpoints such as `/me`, `/dashboard`, and
`/admin/dashboard` using `credentials: "include"`, so the browser sends that
cookie again. The `auth` middleware verifies the JWT, loads the user from the
database, and attaches that user to the request. If the cookie is absent,
expired, invalid, or belongs to a deleted user, the API returns 401 and the
client redirects to the login page.

## 4. A debugging example

One issue was that bookings earlier on the current date could still appear as
upcoming. The backend query intentionally filters by date, so it includes all
of today's confirmed bookings; that alone does not tell whether their end time
has passed. I traced the dashboard data flow, then checked the displayed
booking's combined date and end time against the current time in the
`Asia/Kolkata` offset. The client now filters cached upcoming bookings with
`isBookingOver`, and the same filtered list is used when rendering bookings,
reminders, notifications, and the next-reminder label. I also added the
30-second refresh so countdowns and expired entries do not remain stale while
the page stays open.
