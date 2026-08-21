import { ImageResponse } from "next/og";
import { findPublicChallenge } from "@/data/challenges.server";

export const alt = "RoadIQ driving challenge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ challengeId: string }> }) {
  const { challengeId } = await params;
  const challenge = findPublicChallenge(challengeId);
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0b0b0c", color: "#f5f1e8", overflow: "hidden", fontFamily: "sans-serif" }}>
      {challenge && <>
        <img src={challenge.imageUrl} alt="" width="1200" height="630" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.66 }} />
      </>}
      <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg, rgba(11,11,12,.96) 0%, rgba(11,11,12,.78) 48%, rgba(11,11,12,.2) 100%)" }} />
      <div style={{ position: "relative", width: "720px", padding: "62px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "30px", fontWeight: 800 }}><span style={{ display: "flex", width: "52px", height: "52px", alignItems: "center", justifyContent: "center", borderRadius: "16px", background: "#ff6846", color: "#231713", fontSize: "17px" }}>RQ</span>RoadIQ</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#ff8266", fontSize: "19px", fontWeight: 800, letterSpacing: "3px", textTransform: "uppercase" }}>{challenge?.category ?? "Driving challenge"}</div>
          <div style={{ marginTop: "18px", fontSize: "57px", lineHeight: 1.05, fontWeight: 800, letterSpacing: "-2px" }}>{challenge?.question ?? "How good a driver are you, really?"}</div>
          <div style={{ marginTop: "25px", fontSize: "25px", color: "#d0cbc3" }}>What would you do?</div>
        </div>
      </div>
    </div>,
    size,
  );
}
