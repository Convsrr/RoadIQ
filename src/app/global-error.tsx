"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body style={{ margin: 0, background: "#0b0b0c", color: "#f5f1e8", fontFamily: "system-ui, sans-serif" }}><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}><div><h1>RoadIQ needs a restart.</h1><p style={{ color: "#aaa49b", lineHeight: 1.6 }}>Your local progress has not been cleared.</p><button onClick={reset} style={{ minHeight: 48, marginTop: 20, border: 0, borderRadius: 999, padding: "0 22px", background: "#ff6846", color: "#231713", fontWeight: 700 }}>Reload RoadIQ</button></div></main></body></html>;
}
