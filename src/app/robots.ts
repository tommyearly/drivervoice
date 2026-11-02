import type { MetadataRoute } from "next";
import { PRIVATE_PREFIXES } from "@/lib/seo";
import { siteOrigin } from "@/lib/domain";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_PREFIXES],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
    host: siteOrigin(),
  };
}
