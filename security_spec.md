# Security Specification for Faceless Automation Studio

## Data Invariants
1. A project must always belong to the authenticated user (`userId` logic).
2. Niches must be unique per user.
3. Users can only read/write their own data.

## The "Dirty Dozen" Payloads (Denial Tests)
1. Write project to another user's path.
2. Update `userId` of a project to hijack it.
3. Inject a 2MB string into `title`.
4. Create a project without a `workspaceId`.
5. Update a project's `date` (should be immutable or strictly controlled).
6. Anonymous write to `users` collection.
7. List all projects without a filter for `userId`.
8. Delete another user's niche.
9. Create a niche with an invalid `id` (path poisoning).
10. Update `email` in user profile to a non-verified email (if we check verification).
11. State shortcutting: Setting status to 'Hecho' without having a script (logic layer, harder in rules but we can check essential fields).
12. Bulk download of all users' projects.

## Draft Rules (Phase 1)
I will implement recursive protection and strict schema validation.
