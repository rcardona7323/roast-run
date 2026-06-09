import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@runclub/api/routers";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient(organizationId: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        headers() {
          return {
            "x-organization-id": organizationId,
          };
        },
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}
