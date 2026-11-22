# Error Model — `ProblemDetail` RFC 7807

> Single HTTP error model for all of NeuroAssist NIV. Applies to BE (`@RestControllerAdvice`) and FE (interceptor that normalizes to `ApiError`).
>
> **Source of truth:** `templates/architecture/decisions/error-model.arch.json` (D-064).
> This markdown is generated deterministically. Do not edit by hand — the next render overwrites it.

## Principle

- **All REST endpoints return `application/problem+json`** on errors (RFC 7807).
- **The status code reflects the error type**, but `error.code` (payload field) is the source of truth for the FE to decide the UI.
- **The friendly message goes in `title`**, the technical one in `detail`. The FE shows `title` by default.
- **`error.code` is namespace-prefixed** by module (`<modulo>.<recurso>.<situacao>`) — makes i18n and FE branching easier.

## Canonical schema

```jsonc
// HTTP 422 Unprocessable Entity
// Content-Type: application/problem+json
{
  "type": "https://neuroassist-niv.com/errors/cad.cliente.duplicado",
  "title": "Cliente já cadastrado",
  "status": 422,
  "detail": "Já existe cliente ativo com CNPJ 12.345.678/0001-90 (id=550e8400-e29b-41d4-a716-446655440000)",
  "instance": "/api/cadastros/v1/clientes",
  "error": {
    "code": <string>,
    "category": <enum-of-categories>,
    "correlationId": <uuid>,
    "timestamp": <ISO-8601>,
    "fields": <array<field-error>> // opcional,
    "context": <object> // opcional
  }
}
```

### Extension fields under `error`

- **`code`** (string, required) — Stable identifier for the error, namespace-prefixed by module (e.g. 'cad.cliente.duplicado'). Source for i18n keys and FE branching.
- **`category`** (enum-of-categories, required) — One of categories[*].id. Drives default FE behaviour.
- **`correlationId`** (uuid, required) — Request correlation id from MDC; pairs the error with backend logs.
- **`timestamp`** (ISO-8601, required) — Server time when the error was emitted (with timezone).
- **`fields`** (array<field-error>, optional) — Field-level errors (used by 'validation' category). Each entry: {field, message, rejectedValue?}.
- **`context`** (object, optional) — Free-form metadata for debug or FE display logic (e.g. clienteIdExistente, valorTomathe, codigoSefaz).

## Canonical categories (`error.category` field)

| Category | Default HTTP | Valid statuses | FE hint | When to use |
|---|---|---|---|---|
| `validation` | 422 | 400, 422 | `show_field_marks` | Input is syntactically or semantically invalid (CNPJ malformed, required field empty, date out of format). Detectable BEFORE touching the database. |
| `auth` | 401 | 401 | `redirect_login` | Not authenticated, token expired or session invalid. |
| `forbidden` | 403 | 403 | `show_forbidden_alert` | Authenticated but lacking permission for the requested resource or action. |
| `not_found` | 404 | 404 | `redirect_or_message` | Resource doesn't exist (or is not visible to the current data-scope). |
| `conflict` | 409 | 409 | `show_dialog_with_resolution` | State conflict — duplicate key, concurrency violation, version mismatch. |
| `rate_limit` | 429 | 429 | `retry_with_backoff` | Exceeded the rate limit configured at the gateway. |
| `upstream_error` | 502 | 502, 503, 504 | `show_retry_hint` | Failure in a downstream dependency (Feign call, SEFAZ, Calculadora Oficial, external service). |
| `internal_error` | 500 | 500 | `log_and_show_generic_alert` | Genuine server bug — unhandled exception path. Falls through to GlobalExceptionHandler's generic handler. |
| `business_rule` | 422 | 422 | `show_dialog_with_context` | Input is valid but violates a domain rule that depends on state (client already exists, insufficient stock, cash register already open). Detectable only after consulting the database or another service. |
| `session_stale` | 401 | 401 | `force_refresh_and_relogin` | JWT carries an outdated access-model version (modelo_acesso_versao). FE must refresh the access decision and retry. |

## `error.code` catalogue per module

> 0 modules with catalogued errors (grows as new features are added via service-specs).

## Total

**0 canonical codes** distributed across 0 modules. Expected growth: ~5-10 per module as new features land.

## BE implementation — `@RestControllerAdvice`

Each service has `infrastructure/exception/<Module>ExceptionHandler.java` that extends the base handler from `shared/error-model`. The `GlobalExceptionHandler` (generated via `be-module-generator`) catches unhandled exceptions and returns `internal_error` by default.

```java
@RestControllerAdvice
public class <Module>ExceptionHandler extends NeuroAssistNIVExceptionHandler {

    @ExceptionHandler(ClienteDuplicadoException.class)
    public ProblemDetail handleClienteDuplicado(ClienteDuplicadoException ex, HttpServletRequest req) {
        return problem(HttpStatus.CONFLICT, "cad.cliente.duplicado", ex)
            .title("Cliente já cadastrado")
            .detail(String.format("Já existe cliente ativo com CNPJ %s (id=%s)", ex.cnpj(), ex.clienteIdExistente()))
            .context(Map.of("clienteIdExistente", ex.clienteIdExistente()));
    }
}
```

Errors not explicitly handled fall into `handleGeneric(Throwable)` → status 500, `error.code = internal_error.unhandled`.

## FE implementation — Interceptor

`libs/shared/error-model/src/lib/error.interceptor.ts`:

```typescript
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        const apiError = this.normalize(err);
        this.errorBus.publish(apiError);
        return throwError(() => apiError);
      })
    );
  }
}
```

Components use:

```typescript
const error = signal<ApiError | null>(null);

salvar() {
  this.api.criarCliente(req).subscribe({
    next: c => this.router.navigate(['/cad/clientes', c.id]),
    error: (err: ApiError) => {
      error.set(err);
      // UI mostra err.title; se err.error.fields, marca campos
    }
  });
}
```

The FE can use `error.category` + `fe_action_hint` from the table above to decide the affordance — for example, `show_field_marks` for `validation`, `show_dialog_with_context` for `business_rule`.

## Category `business_rule` vs `validation`

- **`validation`** — input that is *syntactically or semantically* invalid (malformed CNPJ, date out of format, empty required field). Always detectable **before** touching the DB.
- **`business_rule`** — valid input but violates a domain rule that depends on state (`client already exists`, `insufficient stock`, `cash register already open`). Detectable **only after** querying the DB/another service.

The distinction matters because:
- `validation` → the FE marks fields via `error.fields[]` (hint `show_field_marks`).
- `business_rule` → the FE shows a dialog explaining why via `error.context` (hint `show_dialog_with_context`).

## Internationalization

- The frontend loads `i18n/pt-BR/errors.json` with keys = `error.code`:
  ```json
  {
    "cad.cliente.duplicado": "Cliente já cadastrado",
    "rtc.calculadora-oficial.offline": "Calculadora Oficial RFB indisponível — tente novamente"
  }
  ```
- If the key does not exist, it uses the backend `title` as a fallback.
- The `title`s declared in the JSON are **default** values in pt-BR; i18n is the FE's responsibility.

## How to add a new error

1. Edit `templates/architecture/decisions/error-model.arch.json` — add an entry in `modules[prefix=<modulo>].errors`.
2. Validate: `python scripts/arch_decisions.py validate --aspect error-model`.
3. Bump `version` and `last_changed`.
4. Re-render this document (`new-project` P2 or equivalent command).
5. In the BE: throw a specific exception + handler in `<Module>ExceptionHandler` returning the newly declared code.
6. In the FE: add a translation in `i18n/pt-BR/errors.json` keyed by the code.

## Anti-patterns

- ❌ Editing this markdown directly — it is generated. The next render overwrites it.
- ❌ Returning `400 Bad Request` with a custom body (without `ProblemDetail`) — breaks the FE interceptor.
- ❌ Using `500` for business rule errors (should be `422` with `business_rule`).
- ❌ Mixing validation fields at the root level (must go in `error.fields[]`).
- ❌ Leaking a stack trace in `detail` in production (dev environment only).
- ❌ Forgetting `correlationId` in `error` (impossible to trace in the log).
- ❌ Inventing an ad-hoc code in code without registering it in the JSON — breaks i18n + FE branching.

## References

- RFC 7807 ProblemDetail: https://datatracker.ietf.org/doc/html/rfc7807
- BE exception handling: [[../../backend/standards/hexagonal-patterns]] §exception
- FE Access Layer: [[../../frontend/standards/access-layer-contracts]]
- libs/shared/error-model (Nx lib FE): documented in `frontend/libs/shared/error-model/README.md`
