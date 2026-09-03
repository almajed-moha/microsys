# Security Spec

1. Data Invariants: 
   - Every document must belong to a specific `networkId`.
   - Users can only read and write documents that match their own `networkId`.
   - The `system_owner` can access any `networkId`.
   - Users cannot modify their own `role` or `networkId`.

2. The "Dirty Dozen" Payloads:
   - P1: Create document without `networkId`.
   - P2: Create document with `networkId` different from user's `networkId`.
   - P3: Read document belonging to another `networkId`.
   - P4: Update document to change its `networkId`.
   - P5: User modifies their own `role` to `system_owner`.
   - P6: User modifies their own `networkId`.
   - P7: Update document with an invalid type (e.g., price as string).
   - P8: Create user with unverified email.
   - P9: Update document with extra unauthorized fields.
   - P10: Delete a document without correct role (if applicable).
   - P11: Create a document using a large string for ID (ID poisoning).
   - P12: Update a terminal state (if applicable).

3. The Test Runner: 
   - Not fully implemented in TS for this environment, but will be validated via rules structure and ESLint.
