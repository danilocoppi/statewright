# Audit of Payout batch

0 errors, 0 warnings and 6 incomplete. 1 scenario, none going elsewhere. The scenarios cover 73 % of the states, nodes and transitions.

## Problems

### Incomplete

| Code | Target | Level | Message |
| --- | --- | --- | --- |
| `spec.unspecified` | `ept_ledger` |  | endpoint "Book a batch" does not specify request, responses |
| `spec.unspecified` | `ept_pix` |  | endpoint "Send a Pix" does not specify request, responses |
| `spec.unspecified` | `ept_ted` |  | endpoint "Send a TED" does not specify request, responses |
| `spec.unspecified` | `evt_bankConfirmed` |  | event "bank.confirmed" does not specify payload |
| `spec.unspecified` | `evt_batchApproved` |  | event "batch.approved" does not specify payload |
| `spec.unspecified` | `evt_batchPaid` |  | event "batch.paid" does not specify payload |

## Scenarios

| Scenario | Name | Level | Result |
| --- | --- | --- | --- |
| `scn_aPayoutIsRefused` | A payout is refused | `cnv_payOutBatch` | same as recorded |

## Coverage

| Level | Kind | States or nodes | Transitions | Covered | Not reached |
| --- | --- | --- | --- | --- | --- |
| Pay one payout (`cnv_payOne`) | flow | 8 / 9 | 7 / 11 | 75 % | `nod_manual` `edg_manualPaid` `edg_pixRefused` `edg_railManual` `edg_tedPaid` |
| Pay out a batch (`cnv_payOutBatch`) | flow | 10 / 11 | 10 / 11 | 91 % | `nod_paid` `edg_checkPaid` |
| Payout batch (`cnv_batch`) | machine | 0 / 3 | 0 / 3 | 0 % | `nod_paying` `nod_queued` `nod_settled` `edg_initQueued` `edg_payingSettled` `edg_queuedPaying` |
