// elkjs decides it is running as its own web worker when there is no `document`, takes over the worker's messages and
// stops working as a library. Imported first in the layout worker, this stand-in keeps it a library, as in the page.
globalThis.document ??= {};
