import { Construction } from "lucide-react";

export default function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}
