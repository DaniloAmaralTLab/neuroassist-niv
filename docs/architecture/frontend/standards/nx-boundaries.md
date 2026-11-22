# Nx Boundaries (NeuroAssist NIV)

> **Status:** mandatory standard. PR blocked if boundaries are violated.

Goal: prevent architecture drift in `frontend/` (Nx + Angular) using boundaries
enforced by ESLint + `@nx/enforce-module-boundaries`.

---

## High-level rules

- Modules do not import other modules directly.
- `frontend/libs/shared/*` is the only approved reuse path between modules.
- Access Layer (`@neuroassist/shared/access-decision`, `@neuroassist/shared/tenant-context`) is
  cross-cutting; RBAC decisions and tenant context are centralized there.
- Contracts (DTOs, generated OpenAPI) live in `@neuroassist/shared/contracts` -- avoid
  hidden coupling between modules.

---

## Tag model

Every lib/app declares tags in `project.json`. Mandatory combination of `type:*` + `scope:*`:

| `type:*` | `scope:*` | Applies to |
|---|---|---|
| `type:app` | `scope:web` | `frontend/apps/neuroassist-niv-web/` |
| `type:e2e` | `scope:web` | `frontend/apps/neuroassist-niv-web-e2e/` |
| `type:feature` | `scope:<modulo>` | `frontend/libs/<modulo>/feature-*` |
| `type:data-access` | `scope:<modulo>` | `frontend/libs/<modulo>/data-access` |
| `type:ui` | `scope:<modulo>` | `frontend/libs/<modulo>/ui` |
| `type:domain` | `scope:<modulo>` | `frontend/libs/<modulo>/access` |
| `type:ui` | `scope:shared` | `frontend/libs/shared/ui-components`, `ui-tokens`, `ui-feedback` |
| `type:domain` | `scope:shared` | `frontend/libs/shared/access-decision`, `tenant-context`, `auth-session` |
| `type:data-access` | `scope:shared` | `frontend/libs/shared/access-http-base`, `contracts` |

Valid `<modulo>` values: `gest`, `evnt`, `pat`, `acs`, `hist`, `dash`, `edge`, `conv`, `trn`.

---

## Allowed directions

```
app (scope:web)        -> *                          (may import everything)
feature (scope:<M>)    -> data-access(<M>),
                          ui(<M>),
                          access(<M>),
                          shared/*
data-access (scope:<M>) -> shared/contracts,
                           shared/access-http-base,
                           shared/tenant-context,
                           shared/error-model
ui (scope:<M>)         -> shared/ui-*
access (scope:<M>)     -> shared/access-decision,
                          shared/auth-session
shared/*               -> outros shared/* (no circular dep)
```

Forbidden:
- `scope:<M>` importing `scope:<N>` (M ≠ N) -- **hard violation**
- `shared/*` importing from `scope:<modulo>` -- **hard violation**
- `feature` importing another `feature` of the same `scope:<M>` -- avoid (use composition via page)

---

## ESLint configuration (reference)

`frontend/.eslintrc.json` must contain:

```json
{
  "rules": {
    "@nx/enforce-module-boundaries": ["error", {
      "depConstraints": [
        { "sourceTag": "scope:gest",  "onlyDependOnLibsWithTags": ["scope:gest",  "scope:shared"] },
        { "sourceTag": "scope:evnt",  "onlyDependOnLibsWithTags": ["scope:evnt",  "scope:shared"] },
        { "sourceTag": "scope:pat",  "onlyDependOnLibsWithTags": ["scope:pat",  "scope:shared"] },
        { "sourceTag": "scope:acs",  "onlyDependOnLibsWithTags": ["scope:acs",  "scope:shared"] },
        { "sourceTag": "scope:hist",  "onlyDependOnLibsWithTags": ["scope:hist",  "scope:shared"] },
        { "sourceTag": "scope:dash",  "onlyDependOnLibsWithTags": ["scope:dash",  "scope:shared"] },
        { "sourceTag": "scope:edge",  "onlyDependOnLibsWithTags": ["scope:edge",  "scope:shared"] },
        { "sourceTag": "scope:conv",  "onlyDependOnLibsWithTags": ["scope:conv",  "scope:shared"] },
        { "sourceTag": "scope:trn",  "onlyDependOnLibsWithTags": ["scope:trn",  "scope:shared"] },
        { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] },
        { "sourceTag": "scope:web",  "onlyDependOnLibsWithTags": ["scope:web", "scope:gest", "scope:evnt", "scope:pat", "scope:acs", "scope:hist", "scope:dash", "scope:edge", "scope:conv", "scope:trn", "scope:shared"] },
        { "sourceTag": "type:feature",     "onlyDependOnLibsWithTags": ["type:feature", "type:data-access", "type:ui", "type:domain"] },
        { "sourceTag": "type:data-access", "onlyDependOnLibsWithTags": ["type:data-access", "type:domain"] },
        { "sourceTag": "type:ui",          "onlyDependOnLibsWithTags": ["type:ui"] },
        { "sourceTag": "type:domain",      "onlyDependOnLibsWithTags": ["type:domain"] }
      ]
    }]
  }
}
```

---

## PR checklist

- [ ] Imports respect tags (`@nx/enforce-module-boundaries` green).
- [ ] No barrel import that drags in a large graph.
- [ ] Lazy routes preserved (`loadComponent` or `loadChildren`).
- [ ] `nx lint`, `nx test`, `nx build` green.
- [ ] No cross-project `../../../` -- use path mappings from `tsconfig.base.json`.
