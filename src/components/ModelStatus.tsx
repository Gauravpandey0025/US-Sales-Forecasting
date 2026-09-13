export function ModelStatus({ loading, error }: { loading: boolean; error: string | null }) {
  const label = error ? "MODEL ERROR" : loading ? "LOADING MODEL…" : "MODEL READY";
  const dot = error ? "bg-destructive" : loading ? "bg-kraft" : "bg-secondary";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-paper px-3.5 py-1.5 font-mono text-[11px] tracking-widest">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
