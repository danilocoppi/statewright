# Audit of Get paid (as built)

0 errors, 0 warnings and 1 incomplete. 1 scenario, none going elsewhere. The scenarios cover 48 % of the states, nodes and transitions.

## Problems

### Incomplete

| Code | Target | Level | Message |
| --- | --- | --- | --- |
| `machine.unreachable` | `nod_underpaid` | `cnv_open` | state "underpaid" cannot be reached from an initial node or entry |

## Scenarios

| Scenario | Name | Level | Result |
| --- | --- | --- | --- |
| `scn_paidBeforeTheSweep` | Paid before the deadline sweep | `cnv_transaction` | same as recorded |

## Coverage

| Level | Kind | States or nodes | Transitions | Covered | Not reached |
| --- | --- | --- | --- | --- | --- |
| Open (`cnv_open`) | machine | 2 / 3 | 2 / 3 | 67 % | `nod_underpaid` `edg_createOtherTypesAwaitingPayment` |
| Transaction (`cnv_transaction`) | machine | 3 / 6 | 3 / 9 | 40 % | `nod_cancelled` `nod_expired` `nod_failed` `edg_expiredCancelled` `edg_expiredProcessing` `edg_openCancelled` `edg_openExpired` `edg_openFailed` `edg_processingFailed` |
