export default function AiExplorerPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>AI Data Explorer</h1>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Uncover institutional donor trends with conversational intelligence.
      </p>
      <div
        className="rounded-xl p-12 flex items-center justify-center border-2 border-dashed mt-4"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        <p className="text-sm">AI Explorer — coming in next build</p>
      </div>
    </div>
  );
}
