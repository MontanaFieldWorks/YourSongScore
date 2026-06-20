# Firebase Security Specification & Threat Model

This document outlines the data invariants, threat metrics, and a "Dirty Dozen" bad payload test-suite to secure the Yoursongscore application.

## 1. Data Invariants

- **User Profiles (`/users/{userId}`)**:
  - Must only be read or written by the owner (authenticated user with matching UID).
  - Schema keys must include `uid`, `email` and `createdAt`. No extra fields ("Ghost Fields") are permitted.
  - Emails must be lowercased and verified when written.

- **Tracks (`/tracks/{trackId}`)**:
  - Must only be read or written by the track owner (authenticated user where `userId == request.auth.uid`).
  - Strict fields allowlist: `id`, `userId`, `name`, `format`, `size`, `status`, `createdAt`, and optional `convertedMp3Url`, `metrics`, and `critique`.
  - Updatable fields are limited: standard users can transition a track's status or save active critique metadata, but cannot change the owning `userId` or historical fields after creation.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to breach identity, integrity, or system boundaries, and must be rejected (`PERMISSION_DENIED`) by the rules engine:

### Case 1: Identity Spoofing (Attempting to write someone else's User profile)
```json
// Path: /users/victim_user_123
{
  "uid": "attacker_456",
  "email": "attacker@gmail.com",
  "displayName": "The Spoof Artist",
  "createdAt": "2026-06-07T10:00:00Z"
}
```

### Case 2: PII Leak Sweep (Unauthenticated user reading a user profile)
- Action: `GET` /users/victim_user_123 or `LIST` /users
- Expectation: `PERMISSION_DENIED`

### Case 3: Ghost Field Injection on User Profile (Attempting to set unauthorized claims)
```json
// Path: /users/my_user_uid
{
  "uid": "my_user_uid",
  "email": "me@example.com",
  "displayName": "Normal User",
  "createdAt": "2026-06-07T10:00:00Z",
  "isAdmin": true,
  "systemRoles": ["super_admin"]
}
```

### Case 4: Track Hijacking (Authenticated user attempts to write another user's track ID)
```json
// Path: /tracks/victim_track_999
{
  "id": "victim_track_999",
  "userId": "victim_user_123",
  "name": "Victim Song",
  "format": "WAV",
  "size": 15.2,
  "status": "pending_analysis",
  "createdAt": "2026-06-07T10:00:00Z"
}
```

### Case 5: Track Creation with Ghost Fields (Injecting un-validated data)
```json
// Path: /tracks/my_new_track
{
  "id": "my_new_track",
  "userId": "my_user_uid",
  "name": "My Song",
  "format": "WAV",
  "size": 12.0,
  "status": "pending_analysis",
  "createdAt": "2026-06-07T10:00:00Z",
  "developerCheatMode": true,
  "bypassLimit": "yes_please"
}
```

### Case 6: Track Owner Hijacking (Attempting to change track ownership on update)
```json
// Path /tracks/my_track_123 (Existing: ownerId == 'my_user_uid')
{
  "id": "my_track_123",
  "userId": "malicious_user_456",
  "name": "My Song",
  "format": "WAV",
  "size": 12.0,
  "status": "pending_analysis",
  "createdAt": "2026-06-07T10:00:00Z"
}
```

### Case 7: Invalid ID Format (ID Poisoning Attack with recursive path junk characters)
```json
// Path: /tracks/%2F..%2F..%2Fsysadmin_config_or_junk_chars_120321038102
{
  "id": "junk_test",
  "userId": "my_user_uid",
  "name": "My Song",
  "format": "WAV",
  "size": 12.0,
  "status": "pending_analysis",
  "createdAt": "2026-06-07T10:00:00Z"
}
```

### Case 8: Client Timestamp Injection (Overriding server timestamp guarantees)
```json
// Path: /tracks/my_track_123
{
  "id": "my_track_123",
  "userId": "my_user_uid",
  "name": "My Song",
  "format": "WAV",
  "size": 12.0,
  "status": "pending_analysis",
  "createdAt": "1999-01-01T00:00:00Z" // Client-defined historic date spoofed
}
```

### Case 9: Extreme File Size Attack (Denial of Wallet resource exhaustion or float payload bounds)
```json
// Path: /tracks/my_track_123
{
  "id": "my_track_123",
  "userId": "my_user_uid",
  "name": "My Song",
  "format": "WAV",
  "size": 9999999999.9, // Malicious size
  "status": "pending_analysis",
  "createdAt": "2026-06-07T10:00:00Z"
}
```

### Case 10: State Shortcut Transition (Directly changing a track to status 'analyzed' without passing analysis rules)
```json
// Path: /tracks/my_track_123
{
  "id": "my_track_123",
  "userId": "my_user_uid",
  "name": "My Song",
  "format": "WAV",
  "size": 12.0,
  "status": "analyzed", // Shortcuts pending_analysis
  "createdAt": "2026-06-07T10:00:00Z"
}
```

### Case 11: Non-Owner Read / Query Scraping (Trying to read all tracks without bounding by owner id)
- Action: `GET` /tracks/victim_track_999 or `LIST` /tracks
- Expectation: `PERMISSION_DENIED`

### Case 12: Value Poisoning (Injecting non-string types as track format)
```json
// Path: /tracks/my_track_123
{
  "id": "my_track_123",
  "userId": "my_user_uid",
  "name": "My Song",
  "format": true, // Boolean instead of string format
  "size": 12.0,
  "status": "pending_analysis",
  "createdAt": "2026-06-07T10:00:00Z"
}
```
