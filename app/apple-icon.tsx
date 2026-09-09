import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse((<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#F4F5F6" }}><div style={{ width: 112, height: 112, borderRadius: 26, backgroundColor: "#0E6E6E", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 58, fontWeight: 700, fontFamily: "Arial, sans-serif" }}>R</div></div>), { ...size });
}
