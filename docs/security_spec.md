# Security Specification & Audit Plan

## 1. Data Invariants
- A task cannot exist without a valid project ID.
- Access to tasks is derived from project membership.
- Users cannot modify their own roles.
- `createdAt` and `ownerId` are immutable.

## 2. "Dirty Dozen" Payloads (for Testing)
1. Task creation with invalid `projectId`.
2. Task update attempting to change `projectId`.
3. Task update attempting to change `ownerId`.
4. User profile update setting `role` to 'admin'.
5. Project update removing all members (making it unreadable).
6. Task creation with Title as 1MB string (DOW attack).
7. Task creation with `assigneeId` that is not a valid User ID.
8. Activity log creation by user (should be system-only path).
9. Attempt to read PII: `get()` request on another user's profile.
10. Attempt to list tasks in a project where user is not a member.
11. Update 'status' of a completed project (violates status locking).
12. Task creation with `createdAt` set in the future.

## 3. Audit Plan (Phase 5)
- **Shadow Update Test:** For every collection, attempt to inject a field not in the schema (e.g., `isAdmin: true` on user update).
- **Email Spoofing Test:** Validate rules against `request.auth.token.email_verified == true`.
- **PII Isolation:** Verify that user profiles cannot be listed/read by other users.
- **Query Trust Test:** Ensure `allow list` explicitly enforces access based on `resource.data` (e.g., `projectMembers.has(request.auth.uid)`).
- **Conflict Report:** A table comparing collections against Identity Spoofing, State Shortcutting, and Resource Poisoning.
