# Implementation Plan — Tutorly Platform Fixes

## Root Cause Analysis (from codebase investigation)

### 🔴 Why new tutors don't appear in Find Tutors feed
**Root cause:** `EligibilityFilter.hasCapacity()` returns `false` when `tutor.capacity <= 0`. On onboarding, the `OnboardTutorDto` in [onboard-users.dto.ts](file:///c:/Users/USER/Desktop/Final%20Year%20Research/project/backend/src/modules/auth/dtos/onboard-users.dto.ts) does **not** collect `capacity`, so the DB stores the schema default of `0`. The `TopKRanker` still lists them but marks `isEligible: false`, and the frontend renders the jarring red "Ineligible" banner. **Fix:** default capacity to `5` in the onboard path; the ranker already includes ineligible tutors — we just need to fix the frontend banner display.

### 🔴 Missing profile fields (experience, languages, teaching/delivery/format style)
**Root cause:** [onboard-users.dto.ts](file:///c:/Users/USER/Desktop/Final Year Research/project/backend/src/modules/auth/dtos/onboard-users.dto.ts)`OnboardTutorDto` only collects `subjectsTaught`, `gradeLevelsSupported`, `examTypesSupported`, `availability`, `hourlyRate`, `bio`, `timezone`. The fields `experienceYears`, `languages`, `teachingStyle`, `deliveryStyle`, `formatStyle`, `capacity` are never sent. The [users.repository.ts](file:///c:/Users/USER/Desktop/Final%20Year%20Research/project/backend/src/modules/users/users.repository.ts) `onboard()` method also doesn't write them.

Similarly, `OnboardStudentDto` is missing `languages`, `deliveryPreference`, `formatPreference`, `learningStylePreference`, `subjectSpecialization`, `budget`, `region`.

The frontend [onboard/page.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/app/(auth)/onboard/page.tsx) sends a hardcoded `availability` (`2026-01-01T15:00:00`) and passes only a fraction of the collected fields.

### 🔴 avg_rating starts null, rating is on 0–1 scale internally but UI shows 1–5
**Root cause:** `COLD_START_QUALITY = 0.5` (0–1 internal) is used in the algorithm, but `avg_rating` DB column stores the raw EMA result (0–1 range via `FeedbackUpdater`). The UI shows it as "New" when null but doesn't apply the cold-start value visually. Also, `insertFeedbackAndUpdateTutor` never increments `rating_count`.

The `avg_rating` DB check constraint (`>= 0 AND <= 1`) means it stores a normalized 0–1 score but it should now accept 1–5 (we'll keep it internal 0–1 normalized and display as ×5 in UI).

### 🔴 Duplicate React key error (`physics`, `economics`)
**Root cause:** In [StudentList.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/app/(app)/tutors/StudentList.tsx#L154), `personSubjects` is built as `[...(person.subjects ?? []), person.requiredSubject]` — when `requiredSubject` is already in `subjects[]`, it creates duplicates. Both arrays use the same `.map(item => <Badge key={item}>)`.

### 🔴 Notifications use Sessions table
**Root cause:** [NotificationsPanel.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/components/NotificationsPanel.tsx) calls `getMySessions()`. There is no `notifications` table or dedicated notifications module.

---

## Proposed Changes

### PHASE 1 — Database Schema

---

#### [MODIFY] [schema.ts](file:///c:/Users/USER/Desktop/Final%20Year%20Research/project/backend/src/database/schema.ts)
- Add `notifications` table:
  - `id` uuid PK
  - `userId` uuid FK → users
  - `type` text (e.g. `'session_upcoming'`, `'session_passed'`, `'session_request'`)
  - `title` text NOT NULL
  - `message` text NOT NULL
  - `isRead` integer NOT NULL DEFAULT 0
  - `relatedId` text (optional, session/assignment id)
  - `createdAt` timestamp
- Add inferred types: `NotificationRecord`, `NewNotificationRecord`
- **No breaking column changes** — only additive migration.

**Migration:** `pnpm db:generate && pnpm db:migrate`

---

### PHASE 2 — Backend: Onboarding & Profile Data

---

#### [MODIFY] [onboard-users.dto.ts](file:///c:/Users/USER/Desktop/Final Year Research/project/backend/src/modules/auth/dtos/onboard-users.dto.ts)
- `OnboardTutorDto` — add optional fields:
  - `experienceYears?: number` (default 0)
  - `languages?: string[]` (default [])
  - `teachingStyle?: TeachingStyle`
  - `deliveryStyle?: DeliveryMode`
  - `formatStyle?: FormatPreference`
  - `capacity?: number` (default **5** — the fairness baseline so new tutors are always eligible)
  - `gradeLevelsSupported?: number[]` (currently required but not shown in frontend, make optional with default `[9,10,11,12]`)
  - `examTypesSupported?: string[]` (optional, default `['waec','neco','jamb']`)
- `OnboardStudentDto` — add optional fields:
  - `languages?: string[]`
  - `budget?: number`
  - `deliveryPreference?: string`
  - `formatPreference?: string`
  - `learningStylePreference?: string`
  - `subjectSpecialization?: string`
  - `region?: string`

#### [MODIFY] [users.repository.ts](file:///c:/Users/USER/Desktop/Final Year Research/project/backend/src/modules/users/users.repository.ts)
- **Dynamic subject upsert**: Before inserting profiles in `onboard()`, loop through the subject strings (tutor: `subjectsTaught`, student: `subjects`) and `INSERT INTO subjects (id, code, name, category) VALUES (...) ON CONFLICT DO NOTHING` for any subjects that don't exist.
- **Tutor onboard**: Write all newly collected fields (`experienceYears`, `languages`, `teachingStyle`, `deliveryStyle`, `formatStyle`, `capacity` defaulting to 5, `gradeLevelsSupported`, `examTypesSupported`).
- **Student onboard**: Write `languages`, `deliveryPreference`, `formatPreference`, `learningStylePreference`, `budget`, `region`, `subjectSpecialization`.

#### [MODIFY] [onboard/page.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/app/(auth)/onboard/page.tsx)
- **Tutor form**: Add UI fields for `teachingStyle`, `deliveryStyle`, `formatStyle`, `languages`, and `capacity`. Pass them to the `onboard()` call.
- **Student form**: Add UI fields for `languages`, `deliveryPreference`, `formatPreference`, `region`. Pass them to `onboard()`.
- Fix the hardcoded `requestedAvailability` — replace with a reasonable default (current date + 1 week window) or collect from user.
- `gradeLevelsSupported` and `examTypesSupported` can be sent as defaults for tutors since they're already checked in the UI for exam type.

---

### PHASE 3 — Backend: Matchmaking, Ratings & Feedback

---

#### [MODIFY] [matchmaking.repository.ts](file:///c:/Users/USER/Desktop/Final Year Research/project/backend/src/modules/matchmaking/matchmaking.repository.ts)
- In `insertFeedbackAndUpdateTutor()`: add `ratingCount: sql\`${tutorProfiles.ratingCount} + 1\`` to the `UPDATE tutorProfiles` statement so the count always increments.
- `avgRating` is stored as a 0–1 normalized value via `FeedbackUpdater`. The `updatedQuality` passed in is already calculated by `FeedbackUpdater.updateQuality()` using `COLD_START_QUALITY = 0.5` as the base for new tutors. **This is correct** — we preserve the 0–1 internal representation and only transform to 1–5 scale in the API response.

#### [NEW] `notifications` module
- Create `backend/src/modules/notifications/` with:
  - `notifications.module.ts`
  - `notifications.service.ts` — contains `createForUser()`, `getForUser()`, `markRead()`, `createSessionNotification()` (used by sessions service when status changes).
  - `notifications.repository.ts` — DB operations on the new `notifications` table.
  - `notifications.controller.ts` — `GET /notifications` (auth-guarded), `PATCH /notifications/:id/read`, `GET /notifications/unread-count`.
- Register in `app.module.ts`.

#### [MODIFY] [sessions.service.ts](file:///c:/Users/USER/Desktop/Final Year Research/project/backend/src/modules/sessions/sessions.service.ts)
- Inject `NotificationsService`. After `create()` succeeds (pending session), create a `session_request` notification for the other party.
- After `respondToSession()` (accept → `upcoming`), create a `session_upcoming` notification for both participants.
- When a session is updated to `completed`/`cancelled`, create the appropriate notification.

---

### PHASE 4 — Scheduling & Availability Refactor

---

#### [MODIFY] [scheduling.service.ts](file:///c:/Users/USER/Desktop/Final Year Research/project/backend/src/modules/scheduling/scheduling.service.ts)
Add method `getTutorAvailableSlots(tutorId: string, viewerUserId: string, viewerRole: 'student' | 'tutor', fromDate?: Date, toDate?: Date)`:
1. Fetch the tutor's base working-hours slots from `scheduleSlots` table where `status = 'available'`.
2. Fetch all **booked** sessions (status `pending` | `upcoming`) for this tutor in the date range.
3. Subtract the booked session time ranges from the base working-hour slots.
4. **Privacy rules**: 
   - If viewer is the **tutor themselves** → return all sessions with full student details.
   - If viewer is a **student** → return their own sessions with details + other sessions as opaque `{ occupied: true, start, end }` blocks with no student info.
5. Return `{ availableSlots: [...], bookedSlots: [...], isFullyBooked: boolean }`.

#### [MODIFY] [scheduling.controller.ts](file:///c:/Users/USER/Desktop/Final Year Research\project\backend\src\modules\scheduling\scheduling.controller.ts)
- Add `GET /schedules/tutors/:tutorId/slots` — calls `getTutorAvailableSlots()`, returns the structured availability response.
- Add `GET /schedules/tutors/:tutorId/sessions` — for the calendar modal, returns booked sessions for the viewer (privacy-filtered).

---

### PHASE 5 — Frontend UI Fixes & New Screens

---

#### [MODIFY] [FindTutors.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/app/(app)/tutors/FindTutors.tsx)
- Remove the **red "Ineligible" banner** that appears for all students browsing. Keep the tutor visible but **disable the "Book Session" button** with a tooltip `"This tutor is currently at full capacity"` instead.
- Show tutor `capacity` and `assignedCount` as a soft indicator (e.g., "2/5 slots taken").

#### [MODIFY] [StudentList.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/app/(app)/tutors/StudentList.tsx)
- **Fix duplicate key bug**: deduplicate `personSubjects` using `[...new Set([...(person.subjects ?? []), person.requiredSubject].filter(Boolean))]` before `.map()`.
- Remove the red "Ineligible" banner for tutors viewing students too — it's irrelevant from the tutor perspective.

#### [NEW] `/app/(app)/messages/page.tsx` — Messaging Screen
- Full-page messaging interface with:
  - **Left panel**: conversation list (fetched from `GET /messages/conversations`) — shows avatar, name, last message preview, unread dot.
  - **Right panel**: chat interface when a conversation is selected — messages in chronological order, send bar at bottom.
  - A "Join Meeting" icon button in the chat header (for the session associated with the conversation).
- Use the existing `messages.repository.ts` backend (already has `getConversationList`, `getConversation`, `send`, `markRead`).
- Add nav item `{ id: 'messages', label: 'Messages', icon: MessageSquare, href: '/messages' }` to **both** student and tutor nav in [AppShell.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/components/AppShell.tsx).

#### [MODIFY] [AppShell.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/components/AppShell.tsx)
- Add `messages` nav item for student and tutor roles.
- Add **red dot indicator** on the Bell icon when there are unread notifications (polling `GET /notifications/unread-count` every 60s globally, every 10s when notifications panel is open).
- Wire the Mail icon to navigate to `/messages`.

#### [MODIFY] [NotificationsPanel.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/components/NotificationsPanel.tsx)
- Switch from `getMySessions()` to new `getNotifications()` API call.
- Render notification cards by `type` (`session_request`, `session_upcoming`, `session_passed`).
- Mark notifications as read on open.

#### [NEW] Booking Calendar Modal Enhancement
- The existing [BookSessionModal.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/components/BookSessionModal.tsx) needs to be enhanced:
  - Add a calendar date picker step.
  - After picking a date, call `GET /schedules/tutors/:tutorId/slots` to fetch available time slots for that date.
  - Grey out (disable) slots in the past (`new Date(slot.start) < new Date()`).
  - Grey out occupied slots from the API.
  - Let the student select an available slot, then submit → creates `pending` session.

#### [NEW] Profile View Modal
- Create `ProfileViewModal.tsx` component.
- When any user avatar is tapped (in FindTutors, StudentList, Messages, etc.), open a modal fetching `GET /users/:id` and displaying public profile fields (name, bio, subjects, rating, region).
- This modal should be read-only for other users.

#### [MODIFY] Schedules/Availability UI (find the schedules page)
- Grey out/visually disable any time slot where `new Date(slot.startAt) < new Date()`.

---

### PHASE 6 — Rating Display Fix (1–5 Scale in UI)

---

#### [MODIFY] Frontend components that display `avgRating`
- The `avgRating` stored in DB is a 0–1 normalized EMA score.
- In [FindTutors.tsx](file:///c:/Users/USER/Desktop/Final Year Research/project/frontend/app/(app)/tutors/FindTutors.tsx) and [matchmaking.service.ts](file:///c:/Users/USER/Desktop/Final Year Research/project/backend/src/modules/matchmaking/matchmaking.service.ts) response:
  - In `matchmaking.service.ts`, convert `avg_rating` (0–1) to display rating: `displayRating = avgRating ? (Number(avgRating) * 5).toFixed(1) : null`.
  - Include `displayRating` in the `CandidateTutorDto` or the frontend can do `(parseFloat(avgRating) * 5).toFixed(1)`.
- The `rating` submitted by students in `SubmitFeedbackDto` stays 1–5 (already `@Min(0) @Max(5)`).

---

## Verification Plan

### Backend Checks
1. `pnpm db:generate && pnpm db:migrate` — confirm migration applies cleanly.
2. Hit `POST /auth/onboard` as tutor with minimal payload → verify `capacity=5`, `experience_years` etc. are written to DB.
3. `GET /matchmaking/candidates` as a student — verify new tutor appears with `isEligible: true`.
4. Submit feedback (rating = 4) → check `avg_rating` updated to EMA value, `rating_count = 1`.
5. `GET /notifications` — returns notifications.
6. `GET /schedules/tutors/:id/slots` — returns available vs. occupied slots.

### Frontend Checks
1. No console errors for duplicate `physics`/`economics` keys.
2. Find Tutors page — new tutors show but Book Session is disabled (not a red banner).
3. Bell icon shows red dot when unread notification count > 0.
4. Messages page loads conversation list and chat.
5. Booking calendar modal shows greyed-out past/occupied slots.
