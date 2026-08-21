import { ImageResponse } from "next/og";
import { findPublicChallenge } from "@/data/challenges.server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const challenge = findPublicChallenge(id);
  if (!challenge) return new Response("Challenge not found", { status: 404 });
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0b0b0c", color: "#f5f1e8", fontFamily: "sans-serif", padding: "64px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "38px", fontWeight: 800 }}><span style={{ display: "flex", width: "64px", height: "64px", alignItems: "center", justifyContent: "center", borderRadius: "18px", background: "#ff6846", color: "#231713", fontSize: "20px" }}>RQ</span>RoadIQ</div>
        <div style={{ color: "#aaa49b", fontSize: "22px", letterSpacing: "3px", textTransform: "uppercase" }}>{challenge.category}</div>
      </div>
      <div style={{ position: "relative", marginTop: "66px", display: "flex", width: "952px", height: "900px", overflow: "hidden", borderRadius: "44px", background: "#1b1b1e" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires a native image element. */}
        <img src={challenge.imageUrl} alt="" width="952" height="900" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: challenge.imagePosition }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(to bottom, transparent 54%, rgba(0,0,0,.55))" }} />
      </div>
      <div style={{ marginTop: "56px", display: "flex", flexDirection: "column" }}>
        <div style={{ color: "#ff8266", fontSize: "25px", fontWeight: 800, letterSpacing: "4px", textTransform: "uppercase" }}>Make the call</div>
        <div style={{ marginTop: "20px", fontSize: "65px", lineHeight: 1.06, fontWeight: 800, letterSpacing: "-2px" }}>{challenge.question}</div>
        <div style={{ marginTop: "42px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {challenge.answers.map((answer, index) => <div key={answer.id} style={{ display: "flex", alignItems: "center", padding: "25px 30px", border: "2px solid #333337", borderRadius: "24px", fontSize: "30px", background: "#151517" }}><span style={{ display: "flex", width: "42px", color: "#ff8266", fontWeight: 800 }}>{index + 1}</span>{answer.text}</div>)}
        </div>
      </div>
      <div style={{ marginTop: "auto", color: "#aaa49b", fontSize: "25px" }}>Answer at RoadIQ · The result stays hidden until you vote.</div>
    </div>,
    { width: 1080, height: 1920, headers: { "Content-Disposition": `attachment; filename="roadiq-${challenge.slug}.png"` } },
  );
}
