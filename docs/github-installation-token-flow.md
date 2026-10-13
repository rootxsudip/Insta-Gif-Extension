# GitHub App Installation Access Token Flow

Technical diagram of how GitHub issues short-lived installation access tokens via the Apps API, and where they are typically held at runtime.

## Sequence Diagram

```
┌─────────────┐          ┌──────────────┐          ┌──────────────────┐
│   Your App  │          │  GitHub Apps  │          │  GitHub API      │
│   (Backend) │          │     API       │          │  (api.github.com) │
└──────┬──────┘          └──────┬───────┘          └─────────┬────────┘
       │                        │                            │
       │                        │                            │
   ①   │  POST /app/installations/{id}/access_tokens         │
       │  Authorization: Bearer <JWT signed with private key> │
       ├───────────────────────►│                            │
       │                        │                            │
       │                        │  Validates JWT             │
       │                        │  (signed with App's         │
       │                        │   private key, verified     │
       │                        │   against registered       │
       │                        │   public key)              │
       │                        │                            │
   ②   │  201 Created           │                            │
       │  {                      │                            │
       │    "token": "ghs_****", │                            │
       │    "expires_at": "...", │                            │
       │    "permissions": {...} │                            │
       │  }                      │                            │
       │◄───────────────────────┤                            │
       │                        │                            │
       │  ┌─────────────────────────────────────────────┐     │
       │  │  ③ Token held in BACKEND MEMORY / ENV      │     │
       │  │  ┌───────────────────────────────────────┐ │     │
       │  │  │  cache: { token, expires_at }         │ │     │
       │  │  │  (TTL ≈ 1 hour, refreshed before exp) │ │     │
       │  │  └───────────────────────────────────────┘ │     │
       │  │  NEVER sent to the client / browser        │     │
       │  └─────────────────────────────────────────────┘     │
       │                        │                            │
   ④   │  API calls with installation token as Bearer         │
       │  GET /repos/{owner}/{repo}/...                       │
       │  Authorization: Bearer ghs_****                      │
       ├─────────────────────────────────────────────────────►│
       │                        │                            │
       │  200 OK + data          │                            │
       │◄─────────────────────────────────────────────────────┤
       │                        │                            │
       │          ⑤ Token expires (~1 hr)                     │
       │          → repeat from ①                              │
       │                        │                            │
```

## Component Architecture

```
  ┌─────────────────────────────────────────────────────────────┐
  │                      YOUR APP BACKEND                       │
  │                                                             │
  │  ┌───────────────┐    ┌──────────────────┐                 │
  │  │  App Private   │    │  Token Cache     │                 │
  │  │  Key (.pem)    │    │  ┌────────────┐ │                 │
  │  │  ┌──────────┐  │    │  │ ghs_****   │ │                 │
  │  │  │  RSA key  │  │    │  │ expires_at│ │                 │
  │  │  └──────────┘  │    │  └────────────┘ │                 │
  │  └───────┬───────┘    └───────┬──────────┘                 │
  │          │                    │                             │
  │          ▼                    ▼                             │
  │  ┌───────────────┐    ┌──────────────────┐                 │
  │  │  JWT Generator │───►│  Token Manager   │                 │
  │  │  (sign RS256)  │    │  (request/cache) │                 │
  │  └───────────────┘    └───────┬──────────┘                 │
  │                               │                             │
  └───────────────────────────────┼─────────────────────────────┘
                                  │
                          ┌───────┴──────────┐
                          │  GitHub Apps API  │
                          │  POST             │
                          │  /app/installations│
                          │  /{id}/access_tokens│
                          └───────┬──────────┘
                                  │
                                  ▼
                          ┌──────────────────┐
                          │  GitHub API       │
                          │  (api.github.com) │
                          │  Auth: Bearer     │
                          │  ghs_****         │
                          └──────────────────┘
```

## Key Points

| Aspect | Detail |
|---|---|
| **Private key** | RSA private key (`.pem`) registered with the GitHub App; stored as an **environment variable** or secret (e.g. `GITHUB_APP_PRIVATE_KEY`) — never in the repo |
| **JWT** | Signed with the private key (RS256), valid ~10 min; sent to the Apps API to prove the App's identity |
| **Installation token** | Returned by GitHub (`ghs_...`), valid ~1 hour, scoped to a specific installation + its permissions |
| **Storage location** | **Backend memory / cache only** — held in a process-local cache (Redis, in-memory Map, etc.) with a TTL matching `expires_at` |
| **Never** | Sent to the browser/client, stored in `localStorage`, committed to git, or persisted long-term in a database |
| **Refresh** | App re-requests a new token before `expires_at`; the old one is discarded |

## Token Lifecycle

```
   App private key          JWT (10 min)           Installation token (1 hr)
   ──────────────          ──────────             ─────────────────────────
   ┌────────────┐  sign    ┌────────┐  POST       ┌────────────┐   use    ┌──────────┐
   │  RSA .pem  │────────►│  JWT   │───────────►│  ghs_****  │────────►│  GitHub  │
   │  (secret)  │  RS256    │(short) │  /tokens   │ (cached)   │  Bearer  │   API    │
   └────────────┘          └────────┘            └─────┬──────┘          └──────────┘
                                                       │
                                                  expires (~1hr)
                                                       │
                                                       ▼
                                                 re-request ──► back to POST
```
