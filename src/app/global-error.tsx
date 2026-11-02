"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", background: "#F5F7FA", color: "#102335", padding: "2rem" }}>
        <h1>This page could not be loaded</h1>
        <p>Nothing you submitted is shown in this message.</p>
        <button type="button" onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
