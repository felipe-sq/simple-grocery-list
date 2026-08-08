import { ListChecks } from 'lucide-react';

export default function ListsIndexPage() {
  // Only ever visible on desktop: on mobile this pane is unmounted by the shell
  // and the sidebar takes the full screen instead.
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-2xl">
        <ListChecks className="text-muted-foreground size-7" />
      </div>
      <p className="text-lg font-semibold">Select a list</p>
      <p className="text-muted-foreground max-w-xs text-sm">
        Pick a list on the left, or create a new one to get started.
      </p>
    </div>
  );
}
