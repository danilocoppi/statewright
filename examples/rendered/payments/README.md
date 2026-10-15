# Payments

Reference project for a payments platform drawn as state machines: runtime architecture, lifecycle engine with orthogonal regions, and three reusable machines.

## Catalog

### Types

| Type | Kind | Description |
| --- | --- | --- |
| ExpiryContext | object |  |
| Failure | object |  |

### Events

| Event | Payload | Source | Description |
| --- | --- | --- | --- |
| expiry.elapsed | none | internal |  |
| hold.opened |  | internal |  |
| leg.completed |  | internal |  |
| leg.halted |  | internal |  |
| ops.approve | none | Operations |  |
| ops.cancel | none | Operations |  |
| ops.fail | Failure | Operations |  |
| ops.reject |  | Operations |  |
| ops.resume | none | Operations |  |
| ops.rfi |  | Operations |  |
| owner.cancel | none | Client |  |
| owner.upload |  | Client |  |
| parent.final | none | internal |  |
| payin.confirmed |  | Providers |  |
| payin.detected |  | Providers |  |
| payout.completed |  | Providers |  |
| verify.ended | none | Client |  |
| verify.started | none | Client |  |

### Actions

| Action | Input | Output | Description |
| --- | --- | --- | --- |
| Extend expiry |  |  | Adds the paused time to expiresAt, at most 10 days. |
| Refresh quote |  |  |  |

### Guards

| Guard | Expression | Description |
| --- | --- | --- |
| Scaled payout |  | The payout was reduced to the funds actually received. |

### Endpoints

| Endpoint | Request | Auth | Description |
| --- | --- | --- | --- |
| Create payment | POST /payments |  |  |

### Webhooks

| Webhook | Direction | Party | Description |
| --- | --- | --- | --- |
| Provider events | in | Providers |  |

### Timers

| Timer | When | Calendar | Description |
| --- | --- | --- | --- |
| timer.expiry | context.expiresAt |  |  |
| quote_ttl | PT15M |  |  |

### Statuses

| Status | Tone | Description |
| --- | --- | --- |
| cancelled | neutral |  |
| completed | success |  |
| expired | danger |  |
| failed | danger |  |
| partially_completed | success |  |
| pending | warning |  |
| processing | info |  |

### Parties

| Party | Kind | Description |
| --- | --- | --- |
| Client | human |  |
| Operations | operator |  |
| Providers | external |  |

## Runtime

*system · target*

**Runtime: commands, provider facts and timers all enter one engine**

| Element | Kind | Notes |
| --- | --- | --- |
| Clients | actor | dashboard · /pay · admin |
| Command API | service | REST · step-up · idem-key |
| Entity store | store | DynamoDB · version CAS append-only transition log |
| Lifecycle engine | service | spec registry · guards run-to-completion |
| Outbox relay | service | Streams → WS · hooks · mail |
| Provider inbox | queue | SQS FIFO · group = uid |
| Providers | external | PSP · broker · Tatum · Turnkey |
| Scheduler | service | EventBridge one-shot timers |

| From | To | What |
| --- | --- | --- |
| Clients | Command API | command |
| Command API | Lifecycle engine | dispatch |
| Entity store | Outbox relay | stream |
| Lifecycle engine | Entity store | CAS write |
| Outbox relay | Clients | lifecycle:transition (WS) · webhooks · e-mail |
| Outbox relay | Providers | provider commands · idem-key uid:leg:attempt |
| Outbox relay | Scheduler | arm |
| Provider inbox | Lifecycle engine | fact |
| Providers | Provider inbox | Provider events |
| Scheduler | Lifecycle engine | timer.* |

## Runtime › Lifecycle engine

*machine · target · transitions partial*

**One machine per money movement: a parent phase plus orthogonal regions**

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| Compliance hold |  |  | enters Compliance hold |
| Expiry clock |  |  | enters Expiry clock |
| Cross-border send |  |  | enters Cross-border send |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | Compliance hold |  |  |  |
| initial | Expiry clock |  |  |  |
| initial | Cross-border send |  |  |  |

### Scenario: Pays in time

A cross-border send that is paid, converted and paid out in full before the offer expires.

Starts 2026-01-05T09:00:00Z.

1. payin.detected — The payer's money is seen: the expiry clock stops.
2. payin.confirmed — The pay-in is confirmed, and the money is converted.
3. leg.completed — The conversion leg completes; the payout starts.
4. payout.completed — The full amount reaches the recipient.

### Scenario: Verification pauses the clock

While the payer verifies their identity, the expiry deadline stops counting.

Starts 2026-01-05T09:00:00Z.

1. verify.started — The payer starts identity verification. The clock stops.
2. wait P2D — Two days pass; nothing is due while the clock is paused.
3. verify.ended — Verification ends; the clock runs again, the deadline extended.

## Runtime › Lifecycle engine › Compliance hold

*machine · target · transitions complete*

**Compliance hold: an orthogonal gate on every money-moving transition**

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| clear |  |  | money may move |
| docs_in_review |  |  | RFI docs received |
| in_review |  |  | screening · documents |
| rejected |  | failure, terminal | parent → failed \| returning |
| rfi |  |  | more info needed |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| clear | in_review | hold.opened |  |  |
| initial | clear |  |  |  |
| docs_in_review | clear | ops.approve |  |  |
| docs_in_review | rejected | ops.reject |  |  |
| in_review | clear | ops.approve |  |  |
| in_review | rejected | ops.reject |  |  |
| in_review | rfi | ops.rfi |  |  |
| rfi | docs_in_review | owner.upload |  |  |

## Runtime › Lifecycle engine › Expiry clock

*machine · target · transitions complete*

**Expiry clock: a deadline that can pause for payer verification**

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| elapsed |  | stopped, terminal | raises expiry.elapsed |
| paused |  |  | expiryFrozenAt |
| running |  |  | expiresAt |
| stopped |  | success, terminal | pay-in seen · parent final |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | running |  |  |  |
| paused | running | verify.ended (+≤10 d) |  | action Extend expiry |
| paused | stopped | payin.detected |  |  |
| running | elapsed | timer.expiry |  |  |
| running | paused | verify.started |  |  |
| running | stopped | payin.detected \| parent.final |  |  |

## Runtime › Lifecycle engine › Cross-border send

*machine · target · subject `transaction.status` · transitions complete*

**Cross-border send (send · crossBorder)**

Fiat in, stablecoin rail in the middle, fiat out. Legs: srcToHub → hubToDest → payout.

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| awaiting_funds | pending |  | owner bank transfer |
| cancelled | cancelled | stopped, terminal |  |
| completed | completed | success, terminal |  |
| converting | processing |  | srcToHub · hubToDest |
| expired | expired | stopped, terminal |  |
| failed | failed | failure, terminal | failureCode · fundsAt |
| on_hold | processing |  | ops review · fundsAt |
| partially_completed | partially_completed | success, terminal |  |
| paying_out | processing |  | broker → recipient bank |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| awaiting_funds | cancelled | owner.cancel \| ops.cancel |  |  |
| awaiting_funds | converting | payin.confirmed |  |  |
| awaiting_funds | expired | timer.expiry |  |  |
| awaiting_funds | awaiting_funds | quote_ttl · refresh |  | action Refresh quote |
| converting | on_hold | leg.halted |  |  |
| converting | paying_out | hubToDest ✓ | leg = hubToDest |  |
| initial | awaiting_funds |  |  |  |
| on_hold | converting | ops.resume |  |  |
| on_hold | failed | ops.fail(code) |  |  |
| paying_out | completed | payout ✓ | full amount |  |
| paying_out | on_hold | leg.halted |  |  |
| paying_out | partially_completed | payout ✓ | Scaled payout |  |
