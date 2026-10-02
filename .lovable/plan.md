# Correct the false Cloud connection warning

Lovable Cloud is reachable: its sign-in and database services respond normally. The sign-in page currently labels the connection “offline” because its pre-sign-in check tries to read the protected `roles` table. That request returns “permission denied” for a visitor who has not signed in; it does not mean the service is down. The app’s configured Cloud address matches the connected backend.

## Changes

1. Make the sign-in page’s connection check test service reachability rather than access to protected staff data. Show the offline warning only for a genuine connection or configuration failure.
2. Keep the protected-table result in the administrator’s detailed System check, but label missing permission as an access-rule issue rather than a connectivity outage.
3. Verify the sign-in page no longer shows the offline warning while Cloud is reachable, and that a genuine network failure still produces an accurate warning.

## Technical notes

- Update the existing setup-check helper and sign-in warning; preserve the current sign-in and offline fallback behavior.
- No database permissions are widened: unauthenticated visitors should not gain access to staff/role data.
- If signing in still fails, diagnose that separately; a healthy connection does not establish that email sign-in is enabled or demo accounts exist.
