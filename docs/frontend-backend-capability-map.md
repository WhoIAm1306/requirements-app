# Frontend/Backend Capability Map

Updated: 2026-04-27

This file is a working reference for aligning `frontend-react` with existing capabilities from:
- legacy Vue frontend: `frontend`
- backend API: `backend`

## 1) Legacy Vue Frontend: Implemented capabilities

### Routes and sections
- `/login`: authentication flow.
- `/requirements`: proposals registry with filters, table/cards, bulk actions, export/import, detail drawer, create dialog.
- `/gk-directory`: GK contracts/stages/functions directory with edit flows and attachments.
- `/functions-directory`: functions catalog with requirement bind/unbind and Jira epic statuses.
- `/admin/users`: admin users CRUD + import/export.

### Implemented CRUD by entity in Vue
- `requirements`: Create, Read, Update, Delete (soft), archive/restore, unlink GK, export/import.
- `comments`: Create, Read (inside requirement details), Delete. No comment update.
- `requirement attachments`: upload, download, attach-from-library, detach. No rename/replace.
- `contracts (GK)`: full CRUD.
- `stages`: full CRUD.
- `functions`: Create/Update via upsert, Read, Delete.
- `function-requirement links`: bind/unbind + list.
- `users (admin)`: full CRUD + import/export.
- `queues`: Read + Create only.
- `auth`: login, me, change-password, logout (local).

### Not fully implemented in Vue UX
- "Change log" in requirements page is a placeholder.
- Some settings actions (column presets/filter saving) are placeholders.
- `importTZPointsFile` exists in API layer but is not wired in visible UI flow.
- Queue management lacks update/delete UI.

## 2) Backend API: Available capabilities

Base routing: `backend/cmd/app/main.go`

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

### Requirements
- `GET /api/requirements`
- `GET /api/requirements/:id`
- `POST /api/requirements`
- `PUT /api/requirements/:id`
- `DELETE /api/requirements/:id` (soft delete)
- `POST /api/requirements/:id/archive`
- `POST /api/requirements/:id/restore`
- `POST /api/requirements/:id/unlink-gk`
- `GET /api/requirements/:id/gk-link`

### Requirement comments
- `POST /api/requirements/:id/comments`
- `DELETE /api/requirements/:id/comments/:commentId`

### Requirement attachments
- `GET /api/requirements/attachment-library`
- `POST /api/requirements/:id/attachments`
- `POST /api/requirements/:id/attachments/from-library`
- `GET /api/requirements/attachments/:attachmentId/download`
- `DELETE /api/requirements/attachments/:attachmentId`

### Contracts / GK / stages / functions
- `GET /api/contracts`
- `GET /api/contracts/search`
- `GET /api/contracts/:id`
- `POST /api/contracts`
- `PUT /api/contracts/:id`
- `DELETE /api/contracts/:id`
- `GET /api/contracts/:id/stages`
- `POST /api/contracts/:id/stages`
- `PUT /api/contracts/:id/stages/:stageNumber`
- `DELETE /api/contracts/:id/stages/:stageNumber`
- `GET /api/contracts/:id/stages/:stageNumber/functions`
- `POST /api/contracts/:id/functions` (upsert)
- `DELETE /api/contracts/:id/functions/:functionId`
- `GET /api/contracts/:id/functions/:functionId/requirements`
- `POST /api/contracts/:id/functions/:functionId/requirements/bind`
- `POST /api/contracts/:id/functions/:functionId/requirements/unbind`
- `POST /api/contracts/jira-epic-status-preview`
- `GET /api/contracts/:id/stages/:stageNumber/functions/jira-epic-statuses`

### Contract attachments
- `GET /api/contracts/:id/attachments`
- `POST /api/contracts/:id/attachments`
- `GET /api/contracts/attachments/:attachmentId/download`
- `DELETE /api/contracts/attachments/:attachmentId`

### Dictionaries / queues
- `GET /api/queues`
- `POST /api/queues`
- `GET /api/authors`
- `GET /api/tz-points`

### Imports / exports
- `GET /api/export/requirements`
- `POST /api/import/requirements`
- `POST /api/import/tz-points`
- `POST /api/import/gk-tz-functions`
- `GET /api/admin/users/export`
- `POST /api/admin/users/import`

### Admin users
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `DELETE /api/admin/requirements` (bulk delete requirements)

## 3) Backend constraints that matter for frontend

- Role and grants middleware is active for many requirement/GK actions.
- `DELETE /requirements/:id` is soft-delete; archive is separate business action.
- Requirement creation/update has required business fields and validation logic.
- Some fields for read-level users are merged/locked by grants on update.
- File upload endpoints require multipart and allow only whitelisted extensions.
- Import endpoints expect `.xlsx` and return row-level error arrays.
- Queue CRUD is intentionally partial (create/read only).

## 4) Gap map for React migration (priority)

Use this list to close feature parity quickly:

1. Requirements detail/create modal parity:
- full edit/view modes
- archive/restore/delete
- comments create/delete
- attachments upload/download/detach/from-library

2. Requirements list parity:
- all filters and presets
- bulk actions (archive/unlink/delete)
- import/export flows

3. GK and functions parity:
- contracts/stages/functions CRUD
- function-requirement bind/unbind
- Jira epic status preview

4. Admin parity:
- users CRUD
- users import/export
- profile + change password

5. Remaining backend-supported but often missing in UI:
- tz-points import flow
- clear handling for permissions/grants in disabled/read-only fields

## 5) File references for deeper checks

- Vue router/pages: `frontend/src/router`, `frontend/src/pages`
- Vue components: `frontend/src/components`
- Vue API layer: `frontend/src/api`
- Backend route map: `backend/cmd/app/main.go`
- Backend handlers: `backend/internal/handlers`
- Backend middleware/permissions: `backend/internal/middleware`
- Backend models/DTO: `backend/internal/models`

