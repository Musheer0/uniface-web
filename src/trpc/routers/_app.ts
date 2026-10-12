import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { Facerouters } from './face/router';
import { MediaRouters } from './media/router';

export const appRouter = createTRPCRouter({
  face:Facerouters,
  media:MediaRouters
});
 
// export type definition of API
export type AppRouter = typeof appRouter;