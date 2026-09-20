import type { MetadataRoute } from "next";
import { acquisitionPaths, publicOrigin } from "@/lib/seo";
export default function sitemap(): MetadataRoute.Sitemap {
  return [...acquisitionPaths, "/analytics-privacy"].map(path => ({ url: `${publicOrigin}${path}` }));
}
