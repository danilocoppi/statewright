# Order lifecycle — Statewright AI pack

This is a generated summary of the Statewright document `prj_orderLifecycle` (format 1.2). Read the Statewright guide (`npx statewright guide`) before changing it, change it only through commands (`statewright apply`), and reference elements by the IDs below.

## Glossary

| ID | Kind | Name | Where |
| --- | --- | --- | --- |
| `act_chargeCard` | action | Charge card |  |
| `act_sendReceipt` | action | Send receipt |  |
| `cnv_chargeCard` | canvas | Charge card |  |
| `cnv_order` | canvas | Order |  |
| `cnv_orderLifecycle` | canvas | Order lifecycle |  |
| `evt_orderCancelled` | event | order.cancelled |  |
| `evt_orderPlaced` | event | order.placed |  |
| `evt_paymentCaptured` | event | payment.captured |  |
| `nod_cancelled` | state node | cancelled | `cnv_order` |
| `nod_captured` | emit node | nod_captured | `cnv_chargeCard` |
| `nod_cardAccepted` | if node | nod_cardAccepted | `cnv_chargeCard` |
| `nod_chargeDeclined` | end node | Declined | `cnv_chargeCard` |
| `nod_chargeDone` | end node | Charged | `cnv_chargeCard` |
| `nod_chargeStart` | start node | nod_chargeStart | `cnv_chargeCard` |
| `nod_chargeSteps` | steps node | nod_chargeSteps | `cnv_order` |
| `nod_charging` | state node | charging | `cnv_order` |
| `nod_created` | state node | created | `cnv_order` |
| `nod_customer` | actor node | Customer | `cnv_orderLifecycle` |
| `nod_customerHere` | participant node | nod_customerHere | `cnv_order` |
| `nod_init` | initial node | nod_init | `cnv_order` |
| `nod_markCharged` | assign node | nod_markCharged | `cnv_chargeCard` |
| `nod_orders` | store node | Orders | `cnv_orderLifecycle` |
| `nod_paid` | state node | paid | `cnv_order` |
| `nod_payments` | service node | Payments | `cnv_orderLifecycle` |
| `nod_paymentsHere` | participant node | nod_paymentsHere | `cnv_order` |
| `nod_shop` | service node | Shop | `cnv_orderLifecycle` |
| `prj_orderLifecycle` | project | Order lifecycle |  |
| `pty_customer` | party | Customer |  |
| `pty_payments` | party | Payments |  |
| `scn_aDeclinedCard` | scenario | A declined card |  |
| `scn_aPaidOrder` | scenario | A paid order |  |

## Levels

- `cnv_orderLifecycle` "Order lifecycle" [system]
  - `nod_orders` → `cnv_order` "Order" [machine]
- `act_chargeCard` → `cnv_chargeCard` "Charge card" [flow]

## Canvases

### `cnv_chargeCard` "Charge card"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_chargeAccepted` | `nod_cardAccepted` | `nod_markCharged` | true |  |
| `edg_chargeCheck` | `nod_chargeStart` | `nod_cardAccepted` |  |  |
| `edg_chargeEnd` | `nod_captured` | `nod_chargeDone` |  |  |
| `edg_chargeMark` | `nod_markCharged` | `nod_captured` |  |  |
| `edg_chargeRefused` | `nod_cardAccepted` | `nod_chargeDeclined` | false |  |

### `cnv_order` "Order"

machine · transitions complete · subject order.status

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_chargingCancelled` | `nod_charging` | `nod_cancelled` | on:evt_orderCancelled |  |  |
| `edg_chargingPaid` | `nod_charging` | `nod_paid` | on:evt_paymentCaptured |  |  |
| `edg_createdCancelled` | `nod_created` | `nod_cancelled` | on:evt_orderCancelled |  |  |
| `edg_createdCharging` | `nod_created` | `nod_charging` | on:evt_orderPlaced |  | action:act_chargeCard |
| `edg_initCreated` | `nod_init` | `nod_created` | (none) |  |  |

### `cnv_orderLifecycle` "Order lifecycle"

system

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_customerShop` | `nod_customer` | `nod_shop` | command | evt_orderPlaced |
| `edg_shopOrders` | `nod_shop` | `nod_orders` | data |  |
| `edg_shopPayments` | `nod_shop` | `nod_payments` | command |  |

## Findings

None.

## Scenarios

### `scn_aDeclinedCard` "A declined card" on `cnv_order`

start 2026-03-02T10:00:00Z

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_orderPlaced` | `branch@nod_cardAccepted=false` | `nod_charging` |
| 2 | `event:evt_orderCancelled` |  | `nod_cancelled` ended done |

### `scn_aPaidOrder` "A paid order" on `cnv_order`

start 2026-03-02T10:00:00Z

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_orderPlaced` | `branch@nod_cardAccepted=true` | `nod_paid` ended done |

## Problems

None.
