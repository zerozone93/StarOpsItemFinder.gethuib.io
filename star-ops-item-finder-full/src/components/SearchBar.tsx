export function SearchBar({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <input className="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}
