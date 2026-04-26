# Security Specification - Malhar Homestay

## Data Invariants
1. **Gallery Integrity**: A gallery image must have a valid `src` and `createdAt` timestamp.
2. **Access Control**: Only verified administrators can add or remove images.
3. **No Shadow Updates**: Documents in `gallery` cannot be modified with arbitrary fields.
4. **ID Hardening**: All document IDs must be valid (alphanumeric).

## The Dirty Dozen Payloads
1. **Unauthenticated Create**: Attempting to add an image without being signed in.
2. **Non-Admin Create**: Attempting to add an image as a signed-in user without the 'admin' role.
3. **Email Spoofing**: Attempting to write with an unverified email that matches the admin email.
4. **Shadow Field Injection**: Adding an image with an extra `authorized: true` field.
5. **Timestamp Sabotage**: Setting `createdAt` to a client-controlled past/future date instead of `request.time`.
6. **ID Poisoning**: Using a 2KB junk string as a document ID.
7. **Malicious Delete**: A non-admin user attempting to delete a gallery image.
8. **PII Leak**: Attempting to query an `admins` collection without proper authorization.
9. **Resource Exhaustion**: Sending a 1MB string in the `src` field.
10. **State Shortcutting**: Attempting to update the `createdAt` field after creation.
11. **Blanket Read Attack**: Trying to list the entire `admins` collection as a guest.
12. **Type Poisoning**: Sending an integer in the `src` field.

## Protection Strategy
- **Master Gate**: `isAdmin()` helper checking `admins/$(request.auth.uid)`.
- **Validation Blueprints**: `isValidGalleryImage(data)` helper.
- **Action-Based Protection**: Strict `affectedKeys().hasOnly()` gates.
- **Size Enforcements**: All strings restricted to reasonable lengths.
