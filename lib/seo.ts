import type { Metadata } from "next";
export const publicOrigin = "https://recruitos.operationos.org";
export const acquisitionPaths = ["/", "/resume-analysis", "/compare-candidates", "/guides/candidate-evaluation-template"] as const;
export function publicMetadata(title: string, description: string, path: string): Metadata {
  return { title: { absolute: `${title} | RecruitOS` }, description,
    alternates: { canonical: `${publicOrigin}${path}` },
    openGraph: { title, description, url: `${publicOrigin}${path}`, siteName: "RecruitOS", type: "website", images: [{ url: `${publicOrigin}/brand/recruitos/recruitos-social-preview-1200x630.png`, width: 1200, height: 630, alt: "RecruitOS recruiting workspace" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${publicOrigin}/brand/recruitos/recruitos-social-preview-1200x630.png`] } };
}
