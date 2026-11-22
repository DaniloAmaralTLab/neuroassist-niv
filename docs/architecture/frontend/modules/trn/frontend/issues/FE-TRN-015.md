# FE-TRN-015 -- ChatConversationPanelComponent — streaming/responding state, llm-unavailable honest error, sendMessage output

**Status:** 🔲 ABERTA
**GitHub:** [#TBD]

## Outcome
`ChatConversationPanelComponent` is a smart-ish presentational component that renders the `messages: ChatTurn[]` list with a responding-state indicator while `llmState === 'responding'`, and surfaces an honest "assistant unavailable — try again" banner on `llmState === 'error'` without fabricating any proposal.

## Context / Problem statement
- SPEC-02 §1: `ChatConversationPanelComponent` reads `TrainingSessionFacade` directly for `messages()` and `llmState()`; `@Input messages: ChatTurn[]`; emits `(sendMessage text)` → `TrainingSessionFacade.sendDialogTurn(text)`.
- SPEC-07 §2: 503 `llm-unavailable` → `llmState === 'error'` → "assistant unavailable — try again"; no retry by the component; caregiver must re-submit.
- SPEC-04 §4: `llmState === 'responding'` → no fabricated proposal; the `messages` array stays unchanged until the POST returns.
- Large-text streaming: if BE streams SSE, this component shows each partial token; otherwise it shows a spinner.

## Approach (execution path)
1. Create `ChatConversationPanelComponent` as standalone, OnPush, `@Input messages: ChatTurn[]`, `@Input llmState: 'idle' | 'responding' | 'error'`.
2. Template: list of `ChatTurn` items with role badges (caregiver / assistant); a responding spinner when `llmState === 'responding'`; a banner "Assistant unavailable — try again" when `llmState === 'error'`.
3. `sendMessage` output: `EventEmitter<string>` or `OutputEmitter<string>` — the parent (`TrainingSessionPageComponent`) wires it to `sendDialogTurn`.
4. No direct facade injection (input-driven for testability); but can optionally read `TrainingSessionFacade` via `inject()` if the template needs live state.

## Non-goals
- No LLM auto-retry — caregiver-initiated only.
- No fabricated proposal rendered on `'responding'` or `'error'` state.

## Layer(s)
frontend / Feature lib (`libs/trn/feature-training/`)

## Bounded context
trn

## Service execution spec(s)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-02-component-hierarchy.md` (§1 — ChatConversationPanelComponent)
- `docs/architecture/frontend/modules/trn/frontend/frontend-spec/SPEC-07-error-handling.md` (§2 llm-unavailable)

## Architecture alignment
- Standalone + OnPush
- No auto-retry on 503
- No fabricated proposal in responding/error state

## Implementation checklist (by layer/file)

- 🔲 `feature-training/src/lib/chat-conversation-panel/chat-conversation-panel.component.ts` — standalone, OnPush, @Input messages, @Input llmState, @Output sendMessage
- 🔲 Template: responding spinner + llm-unavailable banner (never shows fabricated proposal)
- 🔲 Unit test: when `llmState === 'error'`, the banner text includes "unavailable"
- 🔲 Unit test: when `llmState === 'responding'`, spinner is visible and messages list is unchanged

**Tests**
- 🔲 `npx nx test trn` PASS; `npx nx lint trn` PASS; `npx nx build trn` PASS

## Milestone
Wave 3 / Feature lib (training)

## Labels
type:feature
layer:frontend
scope:trn
priority:P3

## Acceptance criteria
- `llmState === 'error'` renders a visible "unavailable" message and no fabricated assistant reply.
- `llmState === 'responding'` renders a spinner and does NOT append a placeholder assistant message.
- `(sendMessage)` output fires when caregiver submits text.
- `npx nx build trn` PASS.

## Dependencies
- FE-TRN-014 (TrainingSessionPageComponent — parent)
- FE-TRN-011 (TrainingSessionFacade)

## Data impact
- None — read-only rendering.

## API / Contract impact
- None — delegated via parent facade.

## Testing / Evidence required
- Unit tests: responding/error/idle state rendering.

## Risks / Notes
- If the BE later switches to SSE streaming, this component will need a streaming reader — out of scope for v1.
