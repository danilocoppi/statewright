# Payout batch — Statewright AI pack

This is a generated summary of the Statewright document `prj_payoutBatch` (format 1.1). Read the Statewright guide (`npx statewright guide`) before changing it, change it only through commands (`statewright apply`), and reference elements by the IDs below.

## Glossary

| ID | Kind | Name | Where |
| --- | --- | --- | --- |
| `act_flagPayout` | action | Flag a payout |  |
| `act_payOutBatch` | action | Pay out a batch |  |
| `act_reviewPayout` | action | Review a payout by hand |  |
| `cnv_batch` | canvas | Payout batch |  |
| `cnv_payOne` | canvas | Pay one payout |  |
| `cnv_payOutBatch` | canvas | Pay out a batch |  |
| `ept_ledger` | endpoint | Book a batch |  |
| `ept_pix` | endpoint | Send a Pix |  |
| `ept_ted` | endpoint | Send a TED |  |
| `evt_bankConfirmed` | event | bank.confirmed |  |
| `evt_batchApproved` | event | batch.approved |  |
| `evt_batchPaid` | event | batch.paid |  |
| `nod_announce` | emit node | announce it | `cnv_payOutBatch` |
| `nod_book` | call node | book the batch | `cnv_payOutBatch` |
| `nod_both` | join node | both done | `cnv_payOutBatch` |
| `nod_check` | if node | all paid? | `cnv_payOutBatch` |
| `nod_close` | parallel node | close the batch | `cnv_payOutBatch` |
| `nod_confirm` | wait node | the bank confirms | `cnv_payOutBatch` |
| `nod_count` | assign node | count it as flagged | `cnv_payOne` |
| `nod_each` | forEach node | each payout | `cnv_payOutBatch` |
| `nod_flag` | action node | flag it | `cnv_payOne` |
| `nod_flagged` | end node | flagged | `cnv_payOne` |
| `nod_init` | initial node | nod_init | `cnv_batch` |
| `nod_manual` | action node | review it by hand | `cnv_payOne` |
| `nod_onePaid` | end node | paid | `cnv_payOne` |
| `nod_oneStart` | start node | nod_oneStart | `cnv_payOne` |
| `nod_paid` | end node | all paid | `cnv_payOutBatch` |
| `nod_paying` | state node | paying out | `cnv_batch` |
| `nod_pix` | call node | send a Pix | `cnv_payOne` |
| `nod_queued` | state node | queued | `cnv_batch` |
| `nod_rail` | switch node | which rail? | `cnv_payOne` |
| `nod_review` | end node | some to review | `cnv_payOutBatch` |
| `nod_settled` | state node | settled | `cnv_batch` |
| `nod_start` | start node | nod_start | `cnv_payOutBatch` |
| `nod_ted` | call node | send a TED | `cnv_payOne` |
| `nod_total` | assign node | add up the batch | `cnv_payOutBatch` |
| `prj_payoutBatch` | project | Payout batch |  |
| `scn_aPayoutIsRefused` | scenario | A payout is refused |  |
| `tmr_confirmWindow` | timer | confirmation window |  |

## Levels

- `cnv_batch` "Payout batch" [machine]
- `act_payOutBatch` → `cnv_payOutBatch` "Pay out a batch" [flow]
  - `nod_each` → `cnv_payOne` "Pay one payout" [flow]

## Canvases

### `cnv_batch` "Payout batch"

machine · transitions partial

| Edge | From | To | Triggers | Guard | Effects |
| --- | --- | --- | --- | --- | --- |
| `edg_initQueued` | `nod_init` | `nod_queued` | (none) |  |  |
| `edg_payingSettled` | `nod_paying` | `nod_settled` | on:evt_bankConfirmed |  |  |
| `edg_queuedPaying` | `nod_queued` | `nod_paying` | on:evt_batchApproved |  |  |

### `cnv_payOne` "Pay one payout"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_countFlag` | `nod_count` | `nod_flag` |  |  |
| `edg_flagFlagged` | `nod_flag` | `nod_flagged` |  |  |
| `edg_manualPaid` | `nod_manual` | `nod_onePaid` |  |  |
| `edg_oneStartRail` | `nod_oneStart` | `nod_rail` |  |  |
| `edg_pixPaid` | `nod_pix` | `nod_onePaid` |  |  |
| `edg_pixRefused` | `nod_pix` | `nod_count` | error |  |
| `edg_railManual` | `nod_rail` | `nod_manual` | default |  |
| `edg_railPix` | `nod_rail` | `nod_pix` | case "pix" |  |
| `edg_railTed` | `nod_rail` | `nod_ted` | case "ted" |  |
| `edg_tedPaid` | `nod_ted` | `nod_onePaid` |  |  |
| `edg_tedRefused` | `nod_ted` | `nod_count` | error |  |

### `cnv_payOutBatch` "Pay out a batch"

flow

| Edge | From | To | Kind | References |
| --- | --- | --- | --- | --- |
| `edg_announceBoth` | `nod_announce` | `nod_both` |  |  |
| `edg_bookBoth` | `nod_book` | `nod_both` |  |  |
| `edg_bothConfirm` | `nod_both` | `nod_confirm` |  |  |
| `edg_checkPaid` | `nod_check` | `nod_paid` | true |  |
| `edg_checkReview` | `nod_check` | `nod_review` | false |  |
| `edg_closeAnnounce` | `nod_close` | `nod_announce` |  |  |
| `edg_closeBook` | `nod_close` | `nod_book` |  |  |
| `edg_confirmCheck` | `nod_confirm` | `nod_check` |  |  |
| `edg_eachClose` | `nod_each` | `nod_close` |  |  |
| `edg_startTotal` | `nod_start` | `nod_total` |  |  |
| `edg_totalEach` | `nod_total` | `nod_each` |  |  |

## Findings

None.

## Scenarios

### `scn_aPayoutIsRefused` "A payout is refused" on `cnv_payOutBatch`

start 2026-01-05T09:00:00Z · input `{"payouts":[{"amount":120,"id":"pay_1","rail":"pix"},{"amount":80,"id":"pay_2","rail":"ted"}]}` · answers `outcome@nod_each/nod_pix="ok"` `outcome@nod_each/nod_ted="error"`

| Step | Input | Answers | Reached |
| --- | --- | --- | --- |
| 1 | `event:evt_bankConfirmed` |  | ended failure |

## Problems

| Severity | Code | Target | Message |
| --- | --- | --- | --- |
| incomplete | `spec.unspecified` | `ept_ledger` | endpoint "Book a batch" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_pix` | endpoint "Send a Pix" does not specify request, responses |
| incomplete | `spec.unspecified` | `ept_ted` | endpoint "Send a TED" does not specify request, responses |
| incomplete | `spec.unspecified` | `evt_bankConfirmed` | event "bank.confirmed" does not specify payload |
| incomplete | `spec.unspecified` | `evt_batchApproved` | event "batch.approved" does not specify payload |
| incomplete | `spec.unspecified` | `evt_batchPaid` | event "batch.paid" does not specify payload |
