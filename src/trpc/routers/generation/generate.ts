import { imageProcedures } from "./generate-image";
import { videoProcedures } from "./generate-video";

/**
 * Image and video generation mutations live in separate modules. They are
 * merged here so `router.ts` (which holds the CRUD procedures) can spread a
 * single `generateProcedures` object and the public `generation.*` API stays
 * unchanged.
 */
export const generateProcedures = {
  ...imageProcedures,
  ...videoProcedures,
};
