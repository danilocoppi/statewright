/** The examples shipped with the app, loaded only when opened. */
export const EXAMPLES = [
  {
    id: "payments",
    projectId: "prj_payments",
    file: "payments.sttw",
    load: () => import("../../../../../examples/payments.sttw?raw").then(module => module.default)
  },
  {
    id: "getPaid",
    projectId: "prj_getPaid",
    file: "get-paid-as-built.sttw",
    load: () => import("../../../../../examples/get-paid-as-built.sttw?raw").then(module => module.default)
  },
  {
    id: "payoutBatch",
    projectId: "prj_payoutBatch",
    file: "payout-batch.sttw",
    load: () => import("../../../../../examples/payout-batch.sttw?raw").then(module => module.default)
  }
];
