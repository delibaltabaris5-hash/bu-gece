# SPEC: Server-bound free-message quota

Status: **TODO. Not implemented.** The app still enforces the free quota on device.

`src/lib/serverQuota.ts` exports `fetchServerQuota`. It returns `null`. A null snapshot must not grant free messages or Pro. `reconcileSecureQuota` already applies a non-null snapshot with `min(local, server)` for the remaining count.

## What ships today

`freeMessagesRemaining` and the local `isPro` flag are mirrored from Zustand into SecureStore. A first-time device starts at 10 (`FREE_MESSAGE_QUOTA`). A count already stored in AsyncStorage or SecureStore is kept, including a balance left over from the old 2-message quota. Do not raise that stored number to 10. The storage key is the device id:

1. `expo-application` `getAndroidId()` on Android, or `getIosIdForVendorAsync()` on iOS, when that value exists.
2. Otherwise a UUID created on device and stored in SecureStore (not only AsyncStorage).

The chosen id is written to SecureStore under `bugece.install-id`. Later launches keep that stored id so an iOS vendor-id change does not point at a new, empty quota key while the old Keychain item is still there.

On boot, after AsyncStorage hydration, the lower remaining count wins. Wiping AsyncStorage does not refill the allowance when SecureStore still has the lower number. **Kimliği sıfırla** does not refill it either.

## Why this is not full protection

The count has to live somewhere a reinstall cannot wipe. A stable hardware id is not a counter.

- **iOS:** SecureStore uses the Keychain (`AFTER_FIRST_UNLOCK`). That item often survives uninstall and reinstall, so the local counter can stick. It is not a guarantee across every iOS version, and a device restore or a Keychain wipe still resets it.
- **Android:** SecureStore is usually deleted when the app is uninstalled. `androidId` can stay the same and still be useless, because the stored count is gone.
- **Web:** there is no SecureStore. The same keys sit in `localStorage` and disappear with site data.

## Local accounts (this PR)

`src/lib/accountBook.ts` stores a map of email accounts in SecureStore (`bugece.accounts`), plus the current session id. **Kayıt ol** creates an account at 10 messages. **Giriş yap** only restores an existing account and does not mint quota. Each account holds `freeMessagesRemaining`, optional `displayName`, and `isPro`. The same email keeps its stored count across an AsyncStorage wipe when the SecureStore map survives. Sending requires `accountId`.

The locked auth screen stacks **Kayıt ol** over **Gmail ile devam et**. Gmail uses `expo-auth-session` (`Google.useAuthRequest`) when `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, or `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` is set for that platform. A new Google email is stored at 10. An email that already exists, including a password account, keeps its stored remaining count. Client ids stay in the environment (see `.env.example`); this repo does not ship a live Google Cloud client.

This map is still on-device. A new local email can mint another 10 until the server owns the counter. Android uninstall usually deletes the map.

## Next product

1. Sign-in with Apple, Google, or a phone number. A new install must not mint a free quota by itself.
2. The server stores `freeMessagesRemaining` and `isPro` per account. The device id is only a hint.
3. On boot, replace the `fetchServerQuota` stub with a real read. Keep using the lower remaining count so a stale client cannot raise the allowance.
4. Decrement on the server when a free message is accepted. Do not trust the client as the source of truth.
5. Real Pro comes from Play Billing / StoreKit and is recorded on the server. Delete the local mock in `src/billing/mockProBilling.ts` as part of that work, not before.

Do not build that account system until this stub is replaced on purpose.
