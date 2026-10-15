# Payments — Statewright AI pack

This is a generated summary of the Statewright document `prj_payments` (format 1.3). Read the Statewright guide (`npx statewright guide`) before changing it, change it only through commands (`statewright apply`), and reference elements by the IDs below.

## Glossary

| ID | Kind | Name | Where |
| --- | --- | --- | --- |
| `act_extendExpiry` | action | Extend expiry |  |
| `act_refreshQuote` | action | Refresh quote |  |
| `cnv_complianceHold` | canvas | Compliance hold |  |
| `cnv_crossBorderSend` | canvas | Cross-border send |  |
| `cnv_expiryClock` | canvas | Expiry clock |  |
| `cnv_lifecycle` | canvas | Lifecycle engine |  |
| `cnv_runtime` | canvas | Runtime |  |
| `def_complianceHold` | definition | Compliance hold |  |
| `def_crossBorderSend` | definition | Cross-border send |  |
| `def_expiryClock` | definition | Expiry clock |  |
| `ept_createPayment` | endpoint | Create payment |  |
| `evt_expiryElapsed` | event | expiry.elapsed |  |
| `evt_holdOpened` | event | hold.opened |  |
| `evt_legCompleted` | event | leg.completed |  |
| `evt_legHalted` | event | leg.halted |  |
| `evt_opsApprove` | event | ops.approve |  |
| `evt_opsCancel` | event | ops.cancel |  |
| `evt_opsFail` | event | ops.fail |  |
| `evt_opsReject` | event | ops.reject |  |
| `evt_opsResume` | event | ops.resume |  |
| `evt_opsRfi` | event | ops.rfi |  |
| `evt_ownerCancel` | event | owner.cancel |  |
| `evt_ownerUpload` | event | owner.upload |  |
| `evt_parentFinal` | event | parent.final |  |
| `evt_payinConfirmed` | event | payin.confirmed |  |
| `evt_payinDetected` | event | payin.detected |  |
| `evt_payoutCompleted` | event | payout.completed |  |
| `evt_verifyEnded` | event | verify.ended |  |
| `evt_verifyStarted` | event | verify.started |  |
| `grd_scaledPayout` | guard | Scaled payout |  |
| `nod_awaitingFunds` | state node | awaiting_funds | `cnv_crossBorderSend` |
| `nod_cancelled` | state node | cancelled | `cnv_crossBorderSend` |
| `nod_clear` | state node | clear | `cnv_complianceHold` |
| `nod_clients` | actor node | Clients | `cnv_runtime` |
| `nod_commandApi` | service node | Command API | `cnv_runtime` |
| `nod_completed` | state node | completed | `cnv_crossBorderSend` |
| `nod_complianceHold` | state node | Compliance hold | `cnv_lifecycle` |
| `nod_complianceHoldInitial` | initial node | nod_complianceHoldInitial | `cnv_complianceHold` |
| `nod_complianceInitial` | initial node | nod_complianceInitial | `cnv_lifecycle` |
| `nod_converting` | state node | converting | `cnv_crossBorderSend` |
| `nod_crossBorderSendInitial` | initial node | nod_crossBorderSendInitial | `cnv_crossBorderSend` |
| `nod_docsInReview` | state node | docs_in_review | `cnv_complianceHold` |
| `nod_elapsed` | state node | elapsed | `cnv_expiryClock` |
| `nod_entityStore` | store node | Entity store | `cnv_runtime` |
| `nod_expired` | state node | expired | `cnv_crossBorderSend` |
| `nod_expiryClock` | state node | Expiry clock | `cnv_lifecycle` |
| `nod_expiryClockInitial` | initial node | nod_expiryClockInitial | `cnv_expiryClock` |
| `nod_expiryInitial` | initial node | nod_expiryInitial | `cnv_lifecycle` |
| `nod_failed` | state node | failed | `cnv_crossBorderSend` |
| `nod_inReview` | state node | in_review | `cnv_complianceHold` |
| `nod_lifecycleEngine` | service node | Lifecycle engine | `cnv_runtime` |
| `nod_onHold` | state node | on_hold | `cnv_crossBorderSend` |
| `nod_outboxRelay` | service node | Outbox relay | `cnv_runtime` |
| `nod_partiallyCompleted` | state node | partially_completed | `cnv_crossBorderSend` |
| `nod_paused` | state node | paused | `cnv_expiryClock` |
| `nod_payingOut` | state node | paying_out | `cnv_crossBorderSend` |
| `nod_phaseInitial` | initial node | nod_phaseInitial | `cnv_lifecycle` |
| `nod_providerInbox` | queue node | Provider inbox | `cnv_runtime` |
| `nod_providers` | external node | Providers | `cnv_runtime` |
| `nod_rejected` | state node | rejected | `cnv_complianceHold` |
| `nod_rfi` | state node | rfi | `cnv_complianceHold` |
| `nod_running` | state node | running | `cnv_expiryClock` |
| `nod_scheduler` | service node | Scheduler | `cnv_runtime` |
| `nod_sendCrossBorder` | state node | Cross-border send | `cnv_lifecycle` |
| `nod_stopped` | state node | stopped | `cnv_expiryClock` |
| `prj_payments` | project | Payments |  |
| `pty_client` | party | Client |  |
| `pty_ops` | party | Operations |  |
| `pty_providers` | party | Providers |  |
| `rgn_compliance` | region | Compliance hold | `cnv_lifecycle` |
| `rgn_expiry` | region | Expiry clock | `cnv_lifecycle` |
| `rgn_phase` | region | Phase | `cnv_lifecycle` |
| `scn_paysInTime` | scenario | Pays in time |  |
| `scn_verificationPausesTheClock` | scenario | Verification pauses the clock |  |
| `sts_cancelled` | status | cancelled |  |
| `sts_completed` | status | completed |  |
| `sts_expired` | status | expired |  |
| `sts_failed` | status | failed |  |
| `sts_partiallyCompleted` | status | partially_completed |  |
| `sts_pending` | status | pending |  |
| `sts_processing` | status | processing |  |
| `tmr_expiry` | timer | timer.expiry |  |
| `tmr_quoteTtl` | timer | quote_ttl |  |
| `typ_expiryContext` | type | ExpiryContext |  |
| `typ_failure` | type | Failure |  |
| `whk_providerEvents` | webhook | Provider events |  |

## Levels

- `cnv_runtime` "Runtime" [system]
  - `nod_lifecycleEngine` → `cnv_lifecycle` "Lifecycle engine" [machine]
    - `nod_complianceHold` → `def_complianceHold` → `cnv_complianceHold` "Compliance hold" [machine]
    - `nod_expiryClock` → `def_expiryClock` → `cnv_expiryClock` "Expiry clock" [machine]
    - `nod_sendCrossBorder` → `def_crossBorderSend` → `cnv_crossBorderSend` "Cross-border send" [machine]
- `def_complianceHold` → `cnv_complianceHold` "Compliance hold" [machine]
- `def_crossBorderSend` → `cnv_crossBorderSend` "Cross-border send" [machine]
- `def_expiryClock` → `cnv_expiryClock` "Expiry clock" [machine]

## Canvases

### `cnv_complianceHold` "Compliance hold"

machine · stage target · transitions complete

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_clearInReview` | `nod_clear` | `nod_inReview` | on:evt_holdOpened |  |  |
| `edg_complianceHoldStart` | `nod_complianceHoldInitial` | `nod_clear` | (none) |  |  |
| `edg_docsInReviewClear` | `nod_docsInReview` | `nod_clear` | on:evt_opsApprove |  |  |
| `edg_docsInReviewRejected` | `nod_docsInReview` | `nod_rejected` | on:evt_opsReject |  |  |
| `edg_inReviewClear` | `nod_inReview` | `nod_clear` | on:evt_opsApprove |  |  |
| `edg_inReviewRejected` | `nod_inReview` | `nod_rejected` | on:evt_opsReject |  |  |
| `edg_inReviewRfi` | `nod_inReview` | `nod_rfi` | on:evt_opsRfi |  |  |
| `edg_rfiDocsInReview` | `nod_rfi` | `nod_docsInReview` | on:evt_ownerUpload |  |  |

### `cnv_crossBorderSend` "Cross-border send"

machine · stage target · transitions complete · subject transaction.status

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_awaitingFundsCancelled` | `nod_awaitingFunds` | `nod_cancelled` | on:evt_ownerCancel on:evt_opsCancel |  |  |
| `edg_awaitingFundsConverting` | `nod_awaitingFunds` | `nod_converting` | on:evt_payinConfirmed |  |  |
| `edg_awaitingFundsExpired` | `nod_awaitingFunds` | `nod_expired` | after:tmr_expiry |  |  |
| `edg_awaitingFundsRefresh` | `nod_awaitingFunds` | `nod_awaitingFunds` | after:tmr_quoteTtl |  | action:act_refreshQuote |
| `edg_convertingOnHold` | `nod_converting` | `nod_onHold` | on:evt_legHalted |  |  |
| `edg_convertingPayingOut` | `nod_converting` | `nod_payingOut` | on:evt_legCompleted | "leg = hubToDest" |  |
| `edg_crossBorderSendStart` | `nod_crossBorderSendInitial` | `nod_awaitingFunds` | (none) |  |  |
| `edg_onHoldConverting` | `nod_onHold` | `nod_converting` | on:evt_opsResume |  |  |
| `edg_onHoldFailed` | `nod_onHold` | `nod_failed` | on:evt_opsFail |  |  |
| `edg_payingOutCompleted` | `nod_payingOut` | `nod_completed` | on:evt_payoutCompleted | "full amount" |  |
| `edg_payingOutOnHold` | `nod_payingOut` | `nod_onHold` | on:evt_legHalted |  |  |
| `edg_payingOutPartiallyCompleted` | `nod_payingOut` | `nod_partiallyCompleted` | on:evt_payoutCompleted | grd_scaledPayout |  |

### `cnv_expiryClock` "Expiry clock"

machine · stage target · transitions complete

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_expiryClockStart` | `nod_expiryClockInitial` | `nod_running` | (none) |  |  |
| `edg_pausedRunning` | `nod_paused` | `nod_running` | on:evt_verifyEnded |  | action:act_extendExpiry |
| `edg_pausedStopped` | `nod_paused` | `nod_stopped` | on:evt_payinDetected |  |  |
| `edg_runningElapsed` | `nod_running` | `nod_elapsed` | after:tmr_expiry |  |  |
| `edg_runningPaused` | `nod_running` | `nod_paused` | on:evt_verifyStarted |  |  |
| `edg_runningStopped` | `nod_running` | `nod_stopped` | on:evt_payinDetected on:evt_parentFinal |  |  |

### `cnv_lifecycle` "Lifecycle engine"

machine · stage target · transitions partial

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_complianceStart` | `nod_complianceInitial` | `nod_complianceHold` | (none) |  |  |
| `edg_expiryStart` | `nod_expiryInitial` | `nod_expiryClock` | (none) |  |  |
| `edg_phaseStart` | `nod_phaseInitial` | `nod_sendCrossBorder` | (none) |  |  |

### `cnv_runtime` "Runtime"

system · stage target

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_clientsCommandApi` | `nod_clients` | `nod_commandApi` | command | ept_createPayment |
| `edg_commandApiLifecycleEngine` | `nod_commandApi` | `nod_lifecycleEngine` | command |  |
| `edg_entityStoreOutboxRelay` | `nod_entityStore` | `nod_outboxRelay` | stream |  |
| `edg_lifecycleEngineEntityStore` | `nod_lifecycleEngine` | `nod_entityStore` | data |  |
| `edg_outboxRelayClients` | `nod_outboxRelay` | `nod_clients` | stream |  |
| `edg_outboxRelayProviders` | `nod_outboxRelay` | `nod_providers` | command |  |
| `edg_outboxRelayScheduler` | `nod_outboxRelay` | `nod_scheduler` | command |  |
| `edg_providerInboxLifecycleEngine` | `nod_providerInbox` | `nod_lifecycleEngine` | event |  |
| `edg_providersProviderInbox` | `nod_providers` | `nod_providerInbox` | webhook | whk_providerEvents |
| `edg_schedulerLifecycleEngine` | `nod_scheduler` | `nod_lifecycleEngine` | event |  |

## Findings

None.

## Scenarios

### `scn_paysInTime` "Pays in time" on `cnv_lifecycle`

start 2026-01-05T09:00:00Z · context `{"nod_expiryClock":{"expiresAt":"2026-01-15T09:00:00Z"}}`

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_payinDetected` |  | `nod_complianceHold/nod_clear` `nod_expiryClock/nod_stopped` `nod_sendCrossBorder/nod_awaitingFunds` |
| 2 | `event:evt_payinConfirmed` |  | `nod_complianceHold/nod_clear` `nod_expiryClock/nod_stopped` `nod_sendCrossBorder/nod_converting` |
| 3 | `event:evt_legCompleted` | `transition@nod_sendCrossBorder/nod_converting="edg_convertingPayingOut"` | `nod_complianceHold/nod_clear` `nod_expiryClock/nod_stopped` `nod_sendCrossBorder/nod_payingOut` |
| 4 | `event:evt_payoutCompleted` | `transition@nod_sendCrossBorder/nod_payingOut="edg_payingOutCompleted"` | `nod_complianceHold/nod_clear` `nod_expiryClock/nod_stopped` `nod_sendCrossBorder/nod_completed` |

### `scn_verificationPausesTheClock` "Verification pauses the clock" on `cnv_lifecycle`

start 2026-01-05T09:00:00Z · context `{"nod_expiryClock":{"expiresAt":"2026-01-15T09:00:00Z"}}`

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_verifyStarted` |  | `nod_complianceHold/nod_clear` `nod_expiryClock/nod_paused` `nod_sendCrossBorder/nod_awaitingFunds` |
| 2 | `wait:P2D` |  | `nod_complianceHold/nod_clear` `nod_expiryClock/nod_paused` `nod_sendCrossBorder/nod_awaitingFunds` |
| 3 | `event:evt_verifyEnded` |  | `nod_complianceHold/nod_clear` `nod_expiryClock/nod_running` `nod_sendCrossBorder/nod_awaitingFunds` |

## Problems

| Severity | Code | Target | Message |
| --- | --- | --- | --- |
| incomplete | `machine.stuck` | `nod_complianceHold` | state "compliance_hold" has no way out; add a transition or mark it terminal |
| incomplete | `machine.stuck` | `nod_expiryClock` | state "expiry_clock" has no way out; add a transition or mark it terminal |
| incomplete | `machine.stuck` | `nod_sendCrossBorder` | state "send_cross_border" has no way out; add a transition or mark it terminal |
| incomplete | `spec.unspecified` | `ept_createPayment` | endpoint "Create payment" does not specify request, responses |
| incomplete | `spec.unspecified` | `evt_holdOpened` | event "hold.opened" does not specify payload |
| incomplete | `spec.unspecified` | `evt_legCompleted` | event "leg.completed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_legHalted` | event "leg.halted" does not specify payload |
| incomplete | `spec.unspecified` | `evt_opsReject` | event "ops.reject" does not specify payload |
| incomplete | `spec.unspecified` | `evt_opsRfi` | event "ops.rfi" does not specify payload |
| incomplete | `spec.unspecified` | `evt_ownerUpload` | event "owner.upload" does not specify payload |
| incomplete | `spec.unspecified` | `evt_payinConfirmed` | event "payin.confirmed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_payinDetected` | event "payin.detected" does not specify payload |
| incomplete | `spec.unspecified` | `evt_payoutCompleted` | event "payout.completed" does not specify payload |
| incomplete | `spec.unspecified` | `whk_providerEvents` | webhook "Provider events" does not specify payload |
