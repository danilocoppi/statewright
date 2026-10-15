/** The examples shipped with the app, loaded only when opened. */
export const EXAMPLES = [
  {
    id: "payments",
    projectId: "prj_payments",
    file: "payments.statewright.json",
    load: () => import("../../../../../examples/payments.statewright.json?raw").then(module => module.default)
  },
  {
    id: "getPaid",
    projectId: "prj_getPaid",
    file: "get-paid-as-built.statewright.json",
    load: () => import("../../../../../examples/get-paid-as-built.statewright.json?raw").then(module => module.default)
  },
  {
    id: "payoutBatch",
    projectId: "prj_payoutBatch",
    file: "payout-batch.statewright.json",
    load: () => import("../../../../../examples/payout-batch.statewright.json?raw").then(module => module.default)
  }
];
