// statewright/agent (AI interface spec §4): the contract of operations an agent can ask of Statewright — the same in a
// paired Editor (`window.statewright`) and on a file (the file host). The contract defines and checks; hosts run it.
export {
  checkResult,
  errorsOf,
  inputSchemaOf,
  operationNamed,
  operationOfTool,
  toolNameOf,
  validateCall
} from "./contract.js";
export { documentOperations } from "./documents.js";
export { AGENT_ERROR_CODES, AgentError, failure, success } from "./errors.js";
export { problemsChange } from "./file/edit.js";
export { createFileHost } from "./file-host.js";
export { memoryFiles } from "./memory-files.js";
export { CALL_ERRORS, OPERATIONS } from "./operations.js";
export { pointOf, runResultOf, runStateOf } from "./run-view.js";
