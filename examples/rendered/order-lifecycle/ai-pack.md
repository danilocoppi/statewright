# Order lifecycle — Statewright AI pack

This is a generated summary of the Statewright document `prj_orderLifecycle` (format 1.2). Read the Statewright guide (`npx statewright guide`) before changing it, change it only through commands (`statewright apply`), and reference elements by the IDs below.

## Glossary

| ID | Kind | Name | Where |
| --- | --- | --- | --- |
| `act_chargeCard` | action | Charge card |  |
| `act_refundCard` | action | Refund card |  |
| `act_sendReceipt` | action | Send receipt |  |
| `cnv_chargeCard` | canvas | Charge card |  |
| `cnv_checkout` | canvas | Checkout |  |
| `cnv_order` | canvas | Order |  |
| `cnv_orderLifecycle` | canvas | Order lifecycle |  |
| `cnv_returns` | canvas | Returns desk |  |
| `ept_pay` | endpoint | Pay |  |
| `evt_orderCancelled` | event | order.cancelled |  |
| `evt_orderPlaced` | event | order.placed |  |
| `evt_paymentCaptured` | event | payment.captured |  |
| `evt_returnApproved` | event | return.approved |  |
| `evt_returnRequested` | event | return.requested |  |
| `lne_customer` | lane | Customer |  |
| `lne_payments` | lane | Payments |  |
| `nod_approve` | emit node | Approve the return | `cnv_returns` |
| `nod_approveDone` | end node | Approved | `cnv_returns` |
| `nod_approveRefused` | end node | Refused | `cnv_returns` |
| `nod_approveStart` | start node | nod_approveStart | `cnv_returns` |
| `nod_cancelled` | state node | cancelled | `cnv_order` |
| `nod_captured` | emit node | nod_captured | `cnv_chargeCard` |
| `nod_cardAccepted` | if node | nod_cardAccepted | `cnv_chargeCard` |
| `nod_chargeDeclined` | end node | Declined | `cnv_chargeCard` |
| `nod_chargeDone` | end node | Charged | `cnv_chargeCard` |
| `nod_chargeStart` | start node | nod_chargeStart | `cnv_chargeCard` |
| `nod_chargeSteps` | steps node | Charge card | `cnv_order` |
| `nod_charging` | state node | charging | `cnv_order` |
| `nod_chargingHere` | state node | charging | `cnv_checkout` |
| `nod_checkReturn` | if node | nod_checkReturn | `cnv_returns` |
| `nod_checkoutDone` | end node | Checked out | `cnv_checkout` |
| `nod_checkoutStart` | start node | nod_checkoutStart | `cnv_checkout` |
| `nod_created` | state node | created | `cnv_order` |
| `nod_customer` | actor node | Customer | `cnv_orderLifecycle` |
| `nod_customerHere` | participant node | Customer | `cnv_order` |
| `nod_init` | initial node | nod_init | `cnv_order` |
| `nod_markCharged` | assign node | nod_markCharged | `cnv_chargeCard` |
| `nod_orders` | store node | Orders | `cnv_orderLifecycle` |
| `nod_paid` | state node | paid | `cnv_order` |
| `nod_payCall` | call node | Authorise payment | `cnv_checkout` |
| `nod_payments` | service node | Payments | `cnv_orderLifecycle` |
| `nod_paymentsHere` | participant node | Payments | `cnv_order` |
| `nod_paymentsInFlow` | participant node | Payments | `cnv_checkout` |
| `nod_placeOrder` | emit node | Place the order | `cnv_checkout` |
| `nod_returnInit` | initial node | nod_returnInit | `cnv_returns` |
| `nod_returnNew` | state node | new | `cnv_returns` |
| `nod_returnRefunded` | state node | refunded | `cnv_returns` |
| `nod_returnRequested` | state node | requested | `cnv_returns` |
| `nod_returns` | service node | Returns | `cnv_orderLifecycle` |
| `nod_returnsCustomer` | actor node | Customer | `cnv_returns` |
| `nod_returnsPayments` | service node | Payments | `cnv_returns` |
| `nod_shop` | service node | Shop | `cnv_orderLifecycle` |
| `prj_orderLifecycle` | project | Order lifecycle |  |
| `pty_customer` | party | Customer |  |
| `pty_payments` | party | Payments |  |
| `scn_aDeclinedCard` | scenario | A declined card |  |
| `scn_aPaidOrder` | scenario | A paid order |  |
| `scn_aRefundedReturn` | scenario | A refunded return |  |

## Levels

- `cnv_orderLifecycle` "Order lifecycle" [system]
  - `nod_orders` → `cnv_order` "Order" [machine]
  - `nod_returns` → `cnv_returns` "Returns desk" [mixed]
  - `nod_shop` → `cnv_checkout` "Checkout" [flow]
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

### `cnv_checkout` "Checkout"

flow

Roles (derived; change the field that holds them):

- `nod_placeOrder` leads to `nod_chargingHere` — `event` of `nod_placeOrder`
- `nod_payCall` is done by `nod_paymentsInFlow` — `party` of `nod_payCall`

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_checkoutEnd` | `nod_placeOrder` | `nod_checkoutDone` |  |  |
| `edg_checkoutPay` | `nod_checkoutStart` | `nod_payCall` |  |  |
| `edg_checkoutPlace` | `nod_payCall` | `nod_placeOrder` |  |  |

### `cnv_order` "Order"

machine · transitions complete · subject order.status

Roles (derived; change the field that holds them):

- `edg_createdCharging` is for `nod_paymentsHere` — `party` of `act_chargeCard`
- `nod_paid` is for `nod_customerHere` — `party` of `act_sendReceipt`
- `edg_createdCharging` runs `nod_chargeSteps` — `actions` of `edg_createdCharging`
- `nod_customerHere` sends `edg_chargingCancelled` — `source` of `evt_orderCancelled`
- `nod_customerHere` sends `edg_createdCancelled` — `source` of `evt_orderCancelled`
- `nod_customerHere` sends `edg_createdCharging` — `source` of `evt_orderPlaced`

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_chargingCancelled` | `nod_charging` | `nod_cancelled` | on:evt_orderCancelled |  |  |
| `edg_chargingPaid` | `nod_charging` | `nod_paid` | on:evt_paymentCaptured |  |  |
| `edg_createdCancelled` | `nod_created` | `nod_cancelled` | on:evt_orderCancelled |  |  |
| `edg_createdCharging` | `nod_created` | `nod_charging` | on:evt_orderPlaced |  | action:act_chargeCard |
| `edg_initCreated` | `nod_init` | `nod_created` | (none) |  |  |

### `cnv_orderLifecycle` "Order lifecycle"

system

Roles (derived; change the field that holds them):

- `nod_customer` drives `edg_chargingCancelled` — `source` of `evt_orderCancelled`
- `nod_customer` drives `edg_createdCancelled` — `source` of `evt_orderCancelled`
- `nod_customer` drives `edg_createdCharging` — `source` of `evt_orderPlaced`

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_customerShop` | `nod_customer` | `nod_shop` | command | evt_orderPlaced |
| `edg_shopOrders` | `nod_shop` | `nod_orders` | data |  |
| `edg_shopPayments` | `nod_shop` | `nod_payments` | command |  |
| `edg_shopReturns` | `nod_shop` | `nod_returns` | command |  |

### `cnv_returns` "Returns desk"

mixed

Roles (derived; change the field that holds them):

- `edg_returnRefund` is for `nod_returnsPayments` — `party` of `act_refundCard`
- `nod_returnsCustomer` sends `edg_returnAsk` — `source` of `evt_returnRequested`

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_approveCheck` | `nod_approveStart` | `nod_checkReturn` |  |  |
| `edg_approveEnd` | `nod_approve` | `nod_approveDone` |  |  |
| `edg_approveNo` | `nod_checkReturn` | `nod_approveRefused` | false |  |
| `edg_approveYes` | `nod_checkReturn` | `nod_approve` | true |  |
| `edg_returnAsk` | `nod_returnNew` | `nod_returnRequested` | transition |  |
| `edg_returnRefund` | `nod_returnRequested` | `nod_returnRefunded` | transition |  |
| `edg_returnStart` | `nod_returnInit` | `nod_returnNew` | transition |  |

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

### `scn_aRefundedReturn` "A refunded return" on `cnv_returns`

start 2026-03-02T10:00:00Z

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_returnRequested` |  | `nod_returnRequested` |
| 2 | `event:evt_returnApproved` |  | `nod_returnRefunded` ended done |

## Problems

None.
