# Get paid (as built)

## Catalog

### Events

| Event | Payload | Source | Description |
| --- | --- | --- | --- |
| admin.trigger | none | Admin |  |
| transaction.cancel | none | Owner |  |
| custody.override | none | Admin |  |
| deposit.settles | none | PSP |  |
| admin.markFailed | none | Admin |  |
| payer.locked | none | Owner |  |
| psp.paymentFailed | none | PSP |  |
| psp.received | none | PSP |  |
| settled | none | internal |  |
| signing.refused | none | internal |  |

### Timers

| Timer | When | Calendar | Description |
| --- | --- | --- | --- |
| deadline sweep | PT10M |  |  |

### Statuses

| Status | Tone | Description |
| --- | --- | --- |
| awaiting_payment | warning |  |
| cancelled | neutral |  |
| completed | success |  |
| created | warning |  |
| expired | danger |  |
| failed | danger |  |
| processing | info |  |

### Parties

| Party | Kind | Description |
| --- | --- | --- |
| Admin | operator |  |
| Owner | human |  |
| PSP | external |  |

## Transaction

*machine · as-built · subject `transaction.status` · transitions partial*

**The one transition table every transaction shares**

Nine statuses, one table (core.js:34-52). Seven of sixteen status updates call it; seven encode the same edges in their own conditions, and advanceStatus trusts its callers.

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| cancelled | cancelled | stopped, terminal | owner or admin |
| completed | completed | success, terminal | or partially_completed completionStatusFor |
| expired | expired | stopped |  |
| failed | failed | failure, terminal | failureCode: any string |
| open |  |  | shared exits · enters Open |
| processing | processing |  | not a confirmation · built |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| expired | cancelled | owner or admin cancel |  |  |
| expired | processing | onChain custody override (off-table) |  |  |
| initial | open |  |  |  |
| open | cancelled | owner cancel (admin too) |  |  |
| open | expired | deadline: 10-min sweep · lazy read |  |  |
| open | failed | psp.paymentFailed \| signing.refused |  |  |
| open | processing | psp.received \| deposit.settles \| admin.trigger |  |  |
| processing | completed | settled |  |  |
| processing | failed | admin.markFailed \| psp.paymentFailed |  |  |

### Scenario: Paid before the deadline sweep

A transaction the payer locks and pays, settled before the sweep can expire it.

Starts 2026-01-05T09:00:00Z.

1. payer.locked — The payer locks the payment; the transaction waits for the money.
2. psp.received — The payment provider receives the money.
3. settled — The money settles: the transaction is complete.

## Transaction › Open

*machine · as-built · subject `transaction.status` · transitions partial*

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| awaiting_payment | awaiting_payment |  | instructions issued |
| created | created |  | crypto link, no lock |
| underpaid |  |  | same exits as awaiting no writer in deployed code · legacy |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| create (other types) | awaiting_payment | create (other types) |  |  |
| created | awaiting_payment | payer lock |  |  |
| initial | created |  |  |  |

## Findings

| Code | Severity | Finding | On |
| --- | --- | --- | --- |
| H1 | high | advanceStatus trusts its callers | processing |
| H3 | medium | failureCode accepts any string | failed |
