import { useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Briefcase,
  AlertCircle,
  Info,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "job_assigned":
      return <Briefcase className="h-4 w-4 text-primary" />;
    case "job_completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "alert":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
};

const getNotificationBgColor = (type: string, isRead: boolean) => {
  if (isRead) return "bg-background";

  switch (type) {
    case "job_assigned":
      return "bg-primary/5";
    case "job_completed":
      return "bg-green-500/5";
    case "alert":
      return "bg-destructive/5";
    default:
      return "bg-muted/50";
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  return (
    <div
      className={cn(
        "border-b border-border p-3 transition-colors last:border-b-0",
        getNotificationBgColor(notification.type, notification.is_read),
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "truncate text-sm font-medium",
                !notification.is_read && "text-foreground",
                notification.is_read && "text-muted-foreground",
              )}
            >
              {notification.title}
            </p>
            {!notification.is_read && (
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {notification.message}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onMarkAsRead(notification.id)}
              title="Mark as read"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(notification.id)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="mb-2 h-10 w-10 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive"
                onClick={clearAll}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Clear all
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
