import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
import { Facerouters } from './face/router';
 
export const appRouter = createTRPCRouter({
  face:Facerouters
});
 
// export type definition of API
export type AppRouter = typeof appRouter;