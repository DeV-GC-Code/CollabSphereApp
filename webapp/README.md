# CollabSphere Webapp

React/TypeScript single page app for the CollabSphere microservices stack.

## Setup

```bash
pnpm install
pnpm dev
```

Environment variables are defined in `.env` (see `.env.example`).

## Features

- Authentication (signup, login)
- Post feed with composer and like button
- Connections (request/accept/reject)
- Admin health dashboard
- Feature flags for notifications and communities (placeholders)

## Testing

```bash
pnpm test
```

## TODO

- `/api/v1/auth/me` current user endpoint
- Feed pagination & generic feed API
- Suggested connections and pending requests
- Notifications & communities full implementation
- Refresh token handling
- Service metrics endpoints
