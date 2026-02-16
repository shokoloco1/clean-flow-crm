import { useEffect, useCallback } from "react";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

export function useKeyboardShortcuts({ enabled = true, shortcuts }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest('[role="dialog"]');

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : true;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        // For shortcuts with modifiers, allow even in inputs
        const requiresModifier = shortcut.ctrl || shortcut.meta || shortcut.alt;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          // Skip non-modifier shortcuts when in input
          if (isInput && !requiresModifier) continue;

          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);

  return { shortcuts };
}

// Pre-defined admin shortcuts
export function useAdminShortcuts({
  onNewJob,
  onSearch,
  onNavigateJobs,
  onNavigateClients,
  onNavigateStaff,
  enabled = true,
}: {
  onNewJob?: () => void;
  onSearch?: () => void;
  onNavigateJobs?: () => void;
  onNavigateClients?: () => void;
  onNavigateStaff?: () => void;
  enabled?: boolean;
}) {
  const shortcuts: KeyboardShortcut[] = [
    ...(onNewJob
      ? [
          {
            key: "n",
            action: onNewJob,
            description: "New Job",
          },
        ]
      : []),
    ...(onSearch
      ? [
          {
            key: "k",
            ctrl: true,
            action: onSearch,
            description: "Search",
          },
        ]
      : []),
    ...(onNavigateJobs
      ? [
          {
            key: "j",
            action: onNavigateJobs,
            description: "Go to Jobs",
          },
        ]
      : []),
    ...(onNavigateClients
      ? [
          {
            key: "c",
            action: onNavigateClients,
            description: "Go to Clients",
          },
        ]
      : []),
    ...(onNavigateStaff
      ? [
          {
            key: "s",
            action: onNavigateStaff,
            description: "Go to Staff",
          },
        ]
      : []),
  ];

  return useKeyboardShortcuts({ enabled, shortcuts });
}
