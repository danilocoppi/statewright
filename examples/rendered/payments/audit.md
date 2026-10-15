# Audit of Payments

0 errors, 0 warnings and 14 incomplete. 2 scenarios, none going elsewhere. The scenarios cover 48 % of the states, nodes and transitions.

## Problems

### Incomplete

| Code | Target | Level | Message |
| --- | --- | --- | --- |
| `machine.stuck` | `nod_complianceHold` | `cnv_lifecycle` | state "compliance_hold" has no way out; add a transition or mark it terminal |
| `machine.stuck` | `nod_expiryClock` | `cnv_lifecycle` | state "expiry_clock" has no way out; add a transition or mark it terminal |
| `machine.stuck` | `nod_sendCrossBorder` | `cnv_lifecycle` | state "send_cross_border" has no way out; add a transition or mark it terminal |
| `spec.unspecified` | `ept_createPayment` |  | endpoint "Create payment" does not specify request, responses |
| `spec.unspecified` | `evt_holdOpened` |  | event "hold.opened" does not specify payload |
| `spec.unspecified` | `evt_legCompleted` |  | event "leg.completed" does not specify payload |
| `spec.unspecified` | `evt_legHalted` |  | event "leg.halted" does not specify payload |
| `spec.unspecified` | `evt_opsReject` |  | event "ops.reject" does not specify payload |
| `spec.unspecified` | `evt_opsRfi` |  | event "ops.rfi" does not specify payload |
| `spec.unspecified` | `evt_ownerUpload` |  | event "owner.upload" does not specify payload |
| `spec.unspecified` | `evt_payinConfirmed` |  | event "payin.confirmed" does not specify payload |
| `spec.unspecified` | `evt_payinDetected` |  | event "payin.detected" does not specify payload |
| `spec.unspecified` | `evt_payoutCompleted` |  | event "payout.completed" does not specify payload |
| `spec.unspecified` | `whk_providerEvents` |  | webhook "Provider events" does not specify payload |

## Scenarios

| Scenario | Name | Level | Result |
| --- | --- | --- | --- |
| `scn_paysInTime` | Pays in time | `cnv_lifecycle` | same as recorded |
| `scn_verificationPausesTheClock` | Verification pauses the clock | `cnv_lifecycle` | same as recorded |

## Coverage

| Level | Kind | States or nodes | Transitions | Covered | Not reached |
| --- | --- | --- | --- | --- | --- |
| Compliance hold (`cnv_complianceHold`) | machine | 1 / 5 | 1 / 8 | 15 % | `nod_docsInReview` `nod_inReview` `nod_rejected` `nod_rfi` `edg_clearInReview` `edg_docsInReviewClear` `edg_docsInReviewRejected` `edg_inReviewClear` `edg_inReviewRejected` `edg_inReviewRfi` `edg_rfiDocsInReview` |
| Cross-border send (`cnv_crossBorderSend`) | machine | 4 / 9 | 5 / 12 | 43 % | `nod_cancelled` `nod_expired` `nod_failed` `nod_onHold` `nod_partiallyCompleted` `edg_awaitingFundsCancelled` `edg_awaitingFundsExpired` `edg_convertingOnHold` `edg_onHoldConverting` `edg_onHoldFailed` `edg_payingOutOnHold` `edg_payingOutPartiallyCompleted` |
| Expiry clock (`cnv_expiryClock`) | machine | 3 / 4 | 4 / 6 | 70 % | `nod_elapsed` `edg_pausedStopped` `edg_runningElapsed` |
| Lifecycle engine (`cnv_lifecycle`) | machine | 3 / 3 | 3 / 3 | 100 % |  |
