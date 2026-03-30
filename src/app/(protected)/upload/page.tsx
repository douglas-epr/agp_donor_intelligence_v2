export default function UploadPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>CSV Upload &amp; Parsing</h1>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Institutional grade data ingestion and validation engine.
      </p>
      <div
        className="rounded-xl p-12 flex items-center justify-center border-2 border-dashed mt-4"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        <p className="text-sm">Upload screen — coming in next build</p>
      </div>
    </div>
  );
}
