import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@hook/trpc";

export const trpc = createTRPCReact<AppRouter>();
