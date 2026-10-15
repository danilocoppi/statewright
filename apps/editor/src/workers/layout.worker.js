import "./as-library";

import { handlers } from "./layout";
import { serve } from "./protocol";

serve(handlers, self);
