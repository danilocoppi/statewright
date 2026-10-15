# Payout batch

How a batch of payouts is paid: each payout by its rail, a refused one flagged for review, the batch booked and announced at once, then the bank's confirmation. The implementation of the action Pay out a batch.

## Catalog

### Events

| Event | Payload | Source | Description |
| --- | --- | --- | --- |
| bank.confirmed |  |  | The bank confirms that the batch was settled. |
| batch.approved |  |  | Someone with the right approved the batch. |
| batch.paid |  |  | The batch went out: its total and how many were flagged. |

### Actions

| Action | Input | Output | Description |
| --- | --- | --- | --- |
| Flag a payout |  |  | Put a payout the bank refused in the review queue. |
| Pay out a batch |  |  |  |
| Review a payout by hand |  |  |  |

### Endpoints

| Endpoint | Request | Auth | Description |
| --- | --- | --- | --- |
| Book a batch | POST /ledger/batches |  |  |
| Send a Pix | POST /pix/transfers |  |  |
| Send a TED | POST /ted/transfers |  |  |

### Timers

| Timer | When | Calendar | Description |
| --- | --- | --- | --- |
| confirmation window | PT4H |  |  |

## Payout batch

*machine · transitions partial*

| State | Statuses | Outcome | Notes |
| --- | --- | --- | --- |
| paying out |  |  |  |
| queued |  |  |  |
| settled |  | terminal |  |

| From | To | Trigger | Guard | Effects |
| --- | --- | --- | --- | --- |
| initial | queued |  |  |  |
| paying out | settled | bank.confirmed |  |  |
| queued | paying out | batch.approved |  |  |

## Pay out a batch

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| announce it | emit |  |
| book the batch | call |  |
| both done | join |  |
| all paid? | if |  |
| close the batch | parallel |  |
| the bank confirms | wait |  |
| each payout | forEach |  |
| all paid | end |  |
| some to review | end |  |
| nod_start | start |  |
| add up the batch | assign |  |

| From | To | What |
| --- | --- | --- |
| announce it | both done |  |
| book the batch | both done |  |
| both done | the bank confirms |  |
| all paid? | all paid | true |
| all paid? | some to review | false |
| close the batch | announce it |  |
| close the batch | book the batch |  |
| the bank confirms | all paid? |  |
| each payout | close the batch |  |
| start | add up the batch |  |
| add up the batch | each payout |  |

### Scenario: A payout is refused

Two payouts: the Pix goes through, the TED is refused by the bank and flagged for review. The batch is booked and announced, and waits for the bank's confirmation.

Starts 2026-01-05T09:00:00Z.

1. bank.confirmed — The bank confirms the batch. One payout was refused, so the batch ends with something to review.

## Pay out a batch › Pay one payout

*flow*

| Element | Kind | Notes |
| --- | --- | --- |
| count it as flagged | assign |  |
| flag it | action |  |
| flagged | end |  |
| review it by hand | action |  |
| paid | end |  |
| nod_oneStart | start |  |
| send a Pix | call |  |
| which rail? | switch |  |
| send a TED | call |  |

| From | To | What |
| --- | --- | --- |
| count it as flagged | flag it |  |
| flag it | flagged |  |
| review it by hand | paid |  |
| start | which rail? |  |
| send a Pix | paid |  |
| send a Pix | count it as flagged | error |
| which rail? | review it by hand | default |
| which rail? | send a Pix | pix |
| which rail? | send a TED | ted |
| send a TED | paid |  |
| send a TED | count it as flagged | error |
