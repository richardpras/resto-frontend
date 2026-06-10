import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuditSearchProps = {
  onSearch: (query: string) => void;
  loading?: boolean;
  placeholder?: string;
};

export function AuditSearch({
  onSearch,
  loading = false,
  placeholder = "Search document numbers, references, entity IDs…",
}: AuditSearchProps) {
  const [query, setQuery] = useState("");

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(query.trim());
      }}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      <Button type="submit" disabled={loading || query.trim() === ""}>
        Search
      </Button>
    </form>
  );
}
