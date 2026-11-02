import type { MetadataRoute } from "next";
import { PUBLIC_PATHS } from "@/lib/seo";
import { siteOrigin } from "@/lib/domain";
import { getRepository } from "@/lib/data/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const updates = await getRepository().listPublicUpdates();
  return [
    ...PUBLIC_PATHS.map((path) => ({
      url: `${origin}${path === "/" ? "" : path}`,
      changeFrequency: "weekly" as const,
      priority: path === "/" ? 1 : 0.6,
    })),
    ...updates.map((update) => ({
      url: `${origin}/updates/${update.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
