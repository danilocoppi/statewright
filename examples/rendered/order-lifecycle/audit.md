# Audit of Order lifecycle

0 errors, 0 warnings and 0 incomplete. 2 scenarios, none going elsewhere. The scenarios cover 40 % of the states, nodes and transitions.

## Problems

None.

## Scenarios

| Scenario | Name | Level | Result |
| --- | --- | --- | --- |
| `scn_aDeclinedCard` | A declined card | `cnv_order` | same as recorded |
| `scn_aPaidOrder` | A paid order | `cnv_order` | same as recorded |

## Coverage

| Level | Kind | States or nodes | Transitions | Covered | Not reached |
| --- | --- | --- | --- | --- | --- |
| Charge card (`cnv_chargeCard`) | flow | 0 / 6 | 0 / 5 | 0 % | `nod_captured` `nod_cardAccepted` `nod_chargeDeclined` `nod_chargeDone` `nod_chargeStart` `nod_markCharged` `edg_chargeAccepted` `edg_chargeCheck` `edg_chargeEnd` `edg_chargeMark` `edg_chargeRefused` |
| Order (`cnv_order`) | machine | 4 / 4 | 4 / 5 | 89 % | `edg_createdCancelled` |
