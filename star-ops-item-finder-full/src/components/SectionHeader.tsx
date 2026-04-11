export function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="section-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
