import "server-only";
import { resolveMode } from "@/lib/domain";
import { createDemoStore } from "@/lib/data/governed-store";
import { createLiveStore } from "@/lib/data/live-store";
import type { DataStore } from "@/lib/data/types";

export function getRepository(): DataStore {
  return resolveMode(process.env) === "live" ? createLiveStore() : createDemoStore();
}
