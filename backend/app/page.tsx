export default function Home() {
  return (
    <div style={{ fontFamily: "system-ui", padding: "2rem", textAlign: "center" }}>
      <h1>AI Study Companion API</h1>
      <p>Backend is running. Use the frontend at {process.env.FRONTEND_URL || "http://localhost:5173"}</p>
    </div>
  );
}
