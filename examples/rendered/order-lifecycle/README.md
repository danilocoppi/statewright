# Order lifecycle

## Catalog

### Events

| Event | Payload | Source | Description |
| --- | --- | --- | --- |
| order.cancelled | none | Customer |  |
| order.placed | none | Customer |  |
| payment.captured | none | internal |  |

### Actions

| Action | Input | Output | Description |
| --- | --- | --- | --- |
| Charge card |  |  | Charges the order's total to the customer's card. |
| Send receipt |  |  |  |

### Parties

| Party | Kind | Description |
| --- | --- | --- |
| Customer | human |  |
| Payments | system |  |

## Order lifecycle

*system*

A shop's orders: who places them, who charges them, and the order's lifecycle.

| Element | Kind | Notes |
| --- | --- | --- |
| Customer | actor |  |
| Orders | store |  |
| Payments | service |  |
| Shop | service |  |

| From | To | What |
| --- | --- | --- |
| Customer | Shop | order.placed |
| Shop | Orders | data |
| Shop | Payments | command |

## Order lifecycle › Order

*machine · subject `order.status` · transitions complete*

An order from the moment it is placed: the customer sends what moves it, Payments receives the charge, and the charge's steps run where it is called.

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| cancelled |  | stopped, terminal |  |
| charging |  |  |  |
| created |  |  |  |
| paid |  | success, terminal |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| charging | cancelled | order.cancelled |  |  |
| charging | paid | payment.captured |  |  |
| created | cancelled | order.cancelled |  |  |
| created | charging | order.placed |  | action Charge card |
| initial | created |  |  |  |

| From | Role | To | About |
| --- | --- | --- | --- |
| order.placed | is for | Payments | Charge card |
| paid | is for | Customer | Send receipt |
| order.placed | runs | Charge card |  |
| Customer | sends | order.cancelled | order.cancelled |
| Customer | sends | order.cancelled | order.cancelled |
| Customer | sends | order.placed | order.placed |

### Scenario: A declined card

The card is declined: the order waits in charging until the customer cancels it.

Starts 2026-03-02T10:00:00Z.

1. order.placed
2. order.cancelled

### Scenario: A paid order

The customer places the order; the card is accepted, so the charge's own steps capture the payment and the order is paid.

Starts 2026-03-02T10:00:00Z.

1. order.placed — Customer places the order. Payments charges the card: accepted.

## Charge card

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| nod_captured | emit |  |
| nod_cardAccepted | if |  |
| Declined | end |  |
| Charged | end |  |
| nod_chargeStart | start |  |
| nod_markCharged | assign |  |

| From | To | What |
| --- | --- | --- |
| if | assign | true |
| start | if |  |
| emit | Charged |  |
| assign | emit |  |
| if | Declined | false |
