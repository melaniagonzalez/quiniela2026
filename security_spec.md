# Security Specification for Quiniela Administration

## Data Invariants
1. **Admin Authorization**: Only authenticated users with verified administrator emails (such as `melaniagonzalez@gmail.com` or containing `admin`) are permitted to read or write any collection (users, predictions, leagues).
2. **Participant Integrity**: Participant profiles and scores/predictions are fully managed by verified Administrators.
3. **No Self-Registration**: Direct client profile registrations or predictions modification by non-administrators is strictly forbidden.

## The "Dirty Dozen" Malicious Payloads

### UserProfile Collection (/users/{userId})

1. **Malicious Payload 1 (Privilege Escalation via Self-Claim)**
   - Attempt: A non-admin user tries to create or update a profile claiming admin privileges.
   - Result: `PERMISSION_DENIED`

2. **Malicious Payload 2 (Orphaned Participant)**
   - Attempt: Attempting to create a participant with an invalid ID structure.
   - Result: `PERMISSION_DENIED`

3. **Malicious Payload 3 (Poisoned Scores)**
   - Attempt: Injecting negative scores or excessively large numbers into participant metrics.
   - Result: `PERMISSION_DENIED`

4. **Malicious Payload 4 (Identity Theft / Spoofing)**
   - Attempt: Updating a participant profile's name with an empty string or non-string object.
   - Result: `PERMISSION_DENIED`

### UserPrediction Collection (/users/{userId}/predictions/{matchId})

5. **Malicious Payload 5 (Prediction Injection)**
   - Attempt: Inserting soccer scores that are negative.
   - Result: `PERMISSION_DENIED`

6. **Malicious Payload 6 (Tampering with Finished Matches - Admin Override Guard)**
   - Attempt: Modifying a prediction after the restriction window without appropriate admin status.
   - Result: `PERMISSION_DENIED`

7. **Malicious Payload 7 (Ghost Fields Injection)**
   - Attempt: Inserting non-whitelisted keys like `isWinnerCheat: true` into predictions.
   - Result: `PERMISSION_DENIED`

8. **Malicious Payload 8 (Resource Exhaustion)**
   - Attempt: Injecting huge strings into the match ID or other text fields.
   - Result: `PERMISSION_DENIED`

### League Collection (/leagues/{leagueId})

9. **Malicious Payload 9 (Unauthorized League Creation)**
   - Attempt: A standard non-admin account attempts to create a league.
   - Result: `PERMISSION_DENIED`

10. **Malicious Payload 10 (Unauthorized Membership Manipulation)**
    - Attempt: A third party attempts to force-join or modify a league configuration.
    - Result: `PERMISSION_DENIED`

11. **Malicious Payload 11 (Empty / Malformed League Name)**
    - Attempt: Attempting to name a league with empty or null values.
    - Result: `PERMISSION_DENIED`

12. **Malicious Payload 12 (Anonymity Spoofing)**
    - Attempt: Unauthenticated user trying to read any user profiles or list any databases.
    - Result: `PERMISSION_DENIED`
