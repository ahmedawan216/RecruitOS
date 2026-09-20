import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] }, sitemap: `${publicOrigin}/sitemap.xml` };
}
