# Approval Workflow — Approvals by amount/role

> **2-step approval** model for actions that exceed the operational limit of the role. Already present in the prototype: Accounts Payable with amount > limit → status "A aprovar" → manager approves/rejects.

## Context

Some actions in NeuroAssist NIV **cannot be executed directly by the operational role**, even if it has the basic permission:

- VENDEDOR can create a sale, but with a **discount above 10%** needs manager approval.
- FINANCEIRO can post a payable title, but an amount **> R$ 5.000** needs manager approval.
- FISCAL can cancel an NFe **within 24h**; after that only with manager approval.
- ADMIN can reactivate an inactive user, but a user **inactive > 90 days** needs approval from another ADMIN (4-eyes principle).

These rules are scattered across several modules. This document consolidates the model.

## Canonical scenarios (already in the prototype)

### Scenario 1 — Payable above the limit (FIN)

**Prototype:** Phase 2 / M H2 — `TP-2024-2001` appears with status "A aprovar".

1. A FINANCEIRO user creates a title with amount R$ 18.500 (> operator limit R$ 5.000).
2. The system creates a `titulo_pagar` record with status `A_APROVAR` instead of `APROVADO`.
3. The system fires the event `neuroassist-niv.financeiro.aprovacao.solicitada` for a manager task.
4. The manager sees it in their pending list, opens the title.
5. The manager clicks "Aprovar" → status becomes `APROVADO`, event `neuroassist-niv.financeiro.titulo-pagar.aprovado` is published.
6. The manager clicks "Rejeitar" → status `REJEITADO` + field `motivo_rejeicao` filled in.

### Scenario 2 — Discount above 10% on a sale (COM)

1. The salesperson creates a sale with a 12% discount (> 10% salesperson limit).
2. The system creates the `venda` with status `RASCUNHO` + flag `aprovacao_pendente=true`.
3. The salesperson can save and submit for approval, but **cannot invoice**.
4. The manager receives a notification, sees the discount + justification, approves or negotiates.

### Scenario 3 — NFe cancellation past the deadline (FIS)

1. The NFe was authorized 5 days ago (SEFAZ accepts cancellation within 24h).
2. The fiscal user requests cancellation via "Cancelamento Extemporâneo".
3. The system blocks the direct action — requires manager approval + justification.
4. After approval, the system uses an alternative procedure (CC-e or accounting adjustment).

## Data model

Canonical table in each `emp_<x>`:

```sql
CREATE TABLE workflow_aprovacao (
    aprovacao_id     UUID PRIMARY KEY,
    documento_tipo   VARCHAR(50) NOT NULL,    -- 'titulo_pagar', 'venda_desconto', 'nfe_cancelamento'
    documento_id     UUID NOT NULL,           -- polymorphic FK
    solicitante_id   UUID NOT NULL,           -- usuario_id
    solicitado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
    motivo           TEXT,                    -- requester's justification
    papel_aprovador  VARCHAR(50) NOT NULL,    -- GERENTE, ADMIN, ...
    status           VARCHAR(20) NOT NULL,    -- PENDENTE, APROVADO, REJEITADO, EXPIRADO
    aprovador_id     UUID,                    -- filled in at decision time
    decidido_em      TIMESTAMPTZ,
    motivo_decisao   TEXT,                    -- approver's justification
    expira_em        TIMESTAMPTZ,             -- the pending item expires (auto-rejects when it passes)
    contexto         JSONB                    -- snapshot of the relevant state
);

CREATE INDEX idx_workflow_status_papel ON workflow_aprovacao(status, papel_aprovador) WHERE status='PENDENTE';
CREATE INDEX idx_workflow_documento ON workflow_aprovacao(documento_tipo, documento_id);
```

## Canonical rules (limits per role)

> Configurable per tenant via the table `neuroassist_global.parametro_aprovacao`.

| Action | Operational role | Limit | Approver | Justification required |
|---|---|---|---|---|
| **FIN — post payable title** | FINANCEIRO | R$ 5.000 | GERENTE | Yes |
| **FIN — pay title** | FINANCEIRO | R$ 10.000 (independent of the posting) | GERENTE | Yes |
| **FIN — reverse an already-paid title** | FINANCEIRO | always | GERENTE | Yes |
| **FIN — close cash with a difference** | (operator) | difference > R$ 50 | GERENTE | Yes |
| **COM — sale with discount** | VENDEDOR | > 10% | GERENTE | Yes |
| **COM — sale above** | VENDEDOR | R$ 50.000 | GERENTE | No |
| **COM — cancel an already-invoiced sale** | VENDEDOR | always | GERENTE | Yes |
| **FIS — cancel NFe past the SEFAZ deadline** | FISCAL | > 24h | GERENTE | Yes |
| **FIS — void a number range** | FISCAL | > 50 numbers | GERENTE | Yes |
| **CAD — change a customer's credit limit** | (operator) | increase > R$ 10.000 | GERENTE | Yes |
| **CAD — unblock a customer blocked for delinquency** | (operator) | always | FINANCEIRO + GERENTE | Yes |
| **EST — stock adjustment (manual adjustment)** | ALMOXARIFE | qty × value > R$ 1.000 | GERENTE | Yes |
| **RTC — generate PER/DCOMP (refund)** | FINANCEIRO | amount > R$ 5.000 | GERENTE | Yes |
| **IAM — change a user's role** | ADMIN | always | another ADMIN (4-eyes) | Yes |
| **IAM — reactivate a user inactive > 90d** | ADMIN | always | another ADMIN (4-eyes) | Yes |
| **ADM — bulk data export** | ADMIN | > 10.000 records | another ADMIN | Yes |

## Implementation flow in the service

```java
@Service
@Transactional
@RequiredArgsConstructor
public class LancarTituloPagarService {

    private final TituloPagarRepository repo;
    private final WorkflowAprovacaoService workflow;
    private final AccessContextHolder accessCtx;
    private final ParametroAprovacaoService params;
    public TituloPagar executar(LancarTituloPagarCommand cmd) {
        var limite = params.limiteFinanceiroLancamento(accessCtx.tenantId());  // R$ 5.000 default
        var titulo = TituloPagar.criar(cmd);
        if (cmd.valor().compareTo(limite) > 0
            && accessCtx.papel().equals("FINANCEIRO")) {  // GERENTE does not need approval
            titulo.marcarAprovacaoPendente();
            workflow.solicitar(
                "titulo_pagar",
                titulo.getId(),
                accessCtx.usuarioId(),
                "GERENTE",
                cmd.justificativa(),  // required
                Duration.ofDays(7),    // expires in 7d
                titulo.snapshot()
            );
        } else {
            titulo.marcarAprovado();
        }
        return repo.save(titulo);
    }
}
```

## States of `workflow_aprovacao`

```
        SOLICITAÇÃO
             │
             ▼
        PENDENTE ──────────────┐
        │   │   │              │
   aprovar  rejeitar     [timeout 7d]
        │   │              │
        ▼   ▼              ▼
   APROVADO REJEITADO   EXPIRADO
```

- **APROVADO** → action carried out; the document advances in the flow.
- **REJEITADO** → requester notified; can reopen after correcting.
- **EXPIRADO** → equivalent to automatic rejection; allows requesting again.

## Notifications

Each request publishes the event `neuroassist-niv.<modulo>.aprovacao.solicitada` consumed by the `<service>` (Tasks & Agenda) and/or push notifications:

```json
{
  "eventType": "neuroassist-niv.financeiro.aprovacao.solicitada",
  "data": {
    "aprovacaoId": "uuid",
    "documentoTipo": "titulo_pagar",
    "documentoId": "uuid",
    "solicitante": { "id": "uuid", "nome": "Maria Costa" },
    "valorEnvolvido": 18500.00,
    "papelAprovador": "GERENTE",
    "motivo": "Compra emergencial peças máquina",
    "expiraEm": "2026-05-27T17:00:00-03:00"
  }
}
```

## UI in the prototype (reference)

- **Contas a Pagar** (Phase 2 H2) — the "Status" column shows "A aprovar" (yellow badge); the drawer has an "Aprovação" tab with a banner about the limit + Aprovar/Rejeitar buttons.
- **Tarefas & Agenda** (Phase 4 F6) — the manager sees a cross-module list of pending approvals.
- Each affected module must have the **same visual pattern** of status (`A aprovar` / `Aprovada` / `Rejeitada`).

## Corresponding permissions

| Permission | Who gets it |
|---|---|
| `fin.titulo-pagar.aprovar` | GERENTE, ADMIN |
| `com.venda.aprovar-desconto` | GERENTE, ADMIN |
| `fis.nfe.cancelar-extemporaneo` | GERENTE |
| `iam.usuario.alterar-papel` | ADMIN (but needs another ADMIN to approve) |
| `adm.workflow.aprovar` | GERENTE, ADMIN (generic — fallback) |

Full catalog: [[permissoes]].

## Anti-patterns

- ❌ Allowing the requester to be the approver (same user with multiple roles) — always validate `solicitante_id != aprovador_id`.
- ❌ Approval without a written reason — audit loses the trace of the "why".
- ❌ Retroactive approval (after the action was already done) — defeats the purpose.
- ❌ Pending list without prioritization — the manager opens 50 items and misses the critical one.
- ❌ Bypass via direct API (`POST /titulo-pagar` with `status='APROVADO'`) — always via the service that applies the workflow.

## Roadmap (future, not MVP)

- Real-time notification via WebSocket/SSE to the approver.
- Multiple approvers in parallel (any one approves) or serial (all must approve).
- Approval delegation during the manager's vacation.
- Approval quota per manager (cannot approve > R$ 100k/month without another level).

## References

- RBAC model: [[modelo]]
- Permissions: [[permissoes]]
- Session policy: [[session-policy]]
- Event catalog (approval events): [[../contratos/event-catalog]]
- Contas a Pagar prototype: `prototipo/prototype/screens11.jsx` §H2
