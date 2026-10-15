import { handlers } from "./problems";
import { serve } from "./protocol";

serve(handlers, self);
