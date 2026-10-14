import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { Facerouters } from './face/router';
import { MediaRouters } from './media/router';
import { GenerationRouters } from './generation/router';

export const appRouter = createTRPCRouter({
  face:Facerouters,
  media:MediaRouters,
  generation:GenerationRouters
});
 
// export type definition of API
export type AppRouter = typeof appRouter;