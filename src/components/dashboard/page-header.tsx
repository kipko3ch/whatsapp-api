export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h1>
      {description ? <p className="mt-1 max-w-3xl text-sm text-zinc-500">{description}</p> : null}
    </div>
  );
}
