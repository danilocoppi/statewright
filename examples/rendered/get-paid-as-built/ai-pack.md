# Get paid (as built) — Statewright AI pack

This is a generated summary of the Statewright document `prj_getPaid` (format 1.3). Read the Statewright guide (`npx statewright guide`) before changing it, change it only through commands (`statewright apply`), and reference elements by the IDs below.

## Glossary

| ID | Kind | Name | Where |
| --- | --- | --- | --- |
| `cnv_open` | canvas | Open |  |
| `cnv_transaction` | canvas | Transaction |  |
| `evt_adminTrigger` | event | admin.trigger |  |
| `evt_cancel` | event | transaction.cancel |  |
| `evt_custodyOverride` | event | custody.override |  |
| `evt_depositSettled` | event | deposit.settles |  |
| `evt_markFailed` | event | admin.markFailed |  |
| `evt_payerLocked` | event | payer.locked |  |
| `evt_pspPaymentFailed` | event | psp.paymentFailed |  |
| `evt_pspReceived` | event | psp.received |  |
| `evt_settled` | event | settled |  |
| `evt_signingRefused` | event | signing.refused |  |
| `fnd_H1` | finding | H1 |  |
| `fnd_H3` | finding | H3 |  |
| `nod_awaitingPayment` | state node | awaiting_payment | `cnv_open` |
| `nod_cancelled` | state node | cancelled | `cnv_transaction` |
| `nod_completed` | state node | completed | `cnv_transaction` |
| `nod_created` | state node | created | `cnv_open` |
| `nod_expired` | state node | expired | `cnv_transaction` |
| `nod_failed` | state node | failed | `cnv_transaction` |
| `nod_open` | state node | open | `cnv_transaction` |
| `nod_openStart` | initial node | nod_openStart | `cnv_open` |
| `nod_otherTypes` | entry node | create (other types) | `cnv_open` |
| `nod_processing` | state node | processing | `cnv_transaction` |
| `nod_start` | initial node | nod_start | `cnv_transaction` |
| `nod_underpaid` | state node | underpaid | `cnv_open` |
| `prj_getPaid` | project | Get paid (as built) |  |
| `pty_admin` | party | Admin |  |
| `pty_owner` | party | Owner |  |
| `pty_psp` | party | PSP |  |
| `scn_paidBeforeTheSweep` | scenario | Paid before the deadline sweep |  |
| `sts_awaitingPayment` | status | awaiting_payment |  |
| `sts_cancelled` | status | cancelled |  |
| `sts_completed` | status | completed |  |
| `sts_created` | status | created |  |
| `sts_expired` | status | expired |  |
| `sts_failed` | status | failed |  |
| `sts_processing` | status | processing |  |
| `tmr_deadline` | timer | deadline sweep |  |

## Levels

- `cnv_transaction` "Transaction" [machine]
  - `nod_open` → `cnv_open` "Open" [machine]

## Canvases

### `cnv_open` "Open"

machine · stage as-built · transitions partial · subject transaction.status

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_createOtherTypesAwaitingPayment` | `nod_otherTypes` | `nod_awaitingPayment` | (none) |  |  |
| `edg_createdAwaitingPayment` | `nod_created` | `nod_awaitingPayment` | on:evt_payerLocked |  |  |
| `edg_initialCreated` | `nod_openStart` | `nod_created` | (none) |  |  |

### `cnv_transaction` "Transaction"

machine · stage as-built · transitions partial · subject transaction.status

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_expiredCancelled` | `nod_expired` | `nod_cancelled` | on:evt_cancel |  |  |
| `edg_expiredProcessing` | `nod_expired` | `nod_processing` | on:evt_custodyOverride |  |  |
| `edg_initialOpen` | `nod_start` | `nod_open` | (none) |  |  |
| `edg_openCancelled` | `nod_open` | `nod_cancelled` | on:evt_cancel |  |  |
| `edg_openExpired` | `nod_open` | `nod_expired` | after:tmr_deadline |  |  |
| `edg_openFailed` | `nod_open` | `nod_failed` | on:evt_pspPaymentFailed on:evt_signingRefused |  |  |
| `edg_openProcessing` | `nod_open` | `nod_processing` | on:evt_pspReceived on:evt_depositSettled on:evt_adminTrigger |  |  |
| `edg_processingCompleted` | `nod_processing` | `nod_completed` | on:evt_settled |  |  |
| `edg_processingFailed` | `nod_processing` | `nod_failed` | on:evt_markFailed on:evt_pspPaymentFailed |  |  |

## Findings

| ID | Code | Severity | Targets | Title | Source |
| --- | --- | --- | --- | --- | --- |
| `fnd_H1` | H1 | high | `nod_processing` | advanceStatus trusts its callers | audit |
| `fnd_H3` | H3 | medium | `nod_failed` | failureCode accepts any string | audit |

## Scenarios

### `scn_paidBeforeTheSweep` "Paid before the deadline sweep" on `cnv_transaction`

start 2026-01-05T09:00:00Z

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_payerLocked` |  | `nod_open/nod_awaitingPayment` |
| 2 | `event:evt_pspReceived` |  | `nod_processing` |
| 3 | `event:evt_settled` |  | `nod_completed` ended done |

## Problems

| Severity | Code | Target | Message |
| --- | --- | --- | --- |
| incomplete | `machine.unreachable` | `nod_underpaid` | state "underpaid" cannot be reached from an initial node or entry |
