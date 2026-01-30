import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const shortcuts = [
  { keys: ["N"], description: "New Job" },
  { keys: ["⌘", "K"], description: "Search" },
  { keys: ["J"], description: "Go to Jobs / Calendar" },
  { keys: ["C"], description: "Go to Clients" },
  { keys: ["S"], description: "Go to Staff" },
  { keys: ["?"], description: "Show shortcuts" },
];

export function KeyboardShortcutsHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hidden md:flex">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <kbd
                    key={j}
                    className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Shortcuts are disabled when typing in input fields
        </p>
      </DialogContent>
    </Dialog>
  );
}
