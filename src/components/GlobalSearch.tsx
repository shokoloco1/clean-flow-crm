import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Briefcase,
  Users,
  Home,
  UserCircle,
  Filter,
  X,
  Loader2,
  Phone,
  Mail,
  Eye,
} from "lucide-react";
import { useGlobalSearch, SearchFilters } from "@/hooks/useGlobalSearch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

interface Staff {
  user_id: string;
  full_name: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const navigate = useNavigate();
  const { results, loading, search, clearResults } = useGlobalSearch();

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch staff list
  useEffect(() => {
    const fetchStaff = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("is_active", true);
      if (data) setStaffList(data);
    };
    fetchStaff();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query, filters);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, filters, search]);

  const handleSelect = useCallback(
    (result: { id: string; type: string }) => {
      setOpen(false);
      setQuery("");
      clearResults();

      switch (result.type) {
        case "job":
          navigate("/admin/calendar");
          break;
        case "client":
          navigate("/admin/clients");
          break;
        case "property":
          navigate("/admin/properties");
          break;
        case "staff":
          navigate("/admin/staff");
          break;
      }
    },
    [navigate, clearResults]
  );

  const handleQuickAction = useCallback((e: React.MouseEvent, action: string, data: { phone?: string; email?: string; type?: string }) => {
    e.stopPropagation();
    
    switch (action) {
      case "call":
        if (data.phone) {
          window.open(`tel:${data.phone}`, "_self");
          toast.success(`Calling ${data.phone}`);
        } else {
          toast.error("No phone number available");
        }
        break;
      case "email":
        if (data.email) {
          window.open(`mailto:${data.email}`, "_blank");
        } else {
          toast.error("No email available");
        }
        break;
      case "view":
        setOpen(false);
        setQuery("");
        clearResults();
        if (data.type === "job") {
          navigate("/admin/calendar");
        } else if (data.type === "client") {
          navigate("/admin/clients");
        } else if (data.type === "staff") {
          navigate("/admin/staff");
        }
        break;
    }
  }, [navigate, clearResults]);

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const getIcon = (type: string) => {
    switch (type) {
      case "job":
        return <Briefcase className="h-4 w-4 text-primary" />;
      case "client":
        return <UserCircle className="h-4 w-4 text-green-500" />;
      case "property":
        return <Home className="h-4 w-4 text-orange-500" />;
      case "staff":
        return <Users className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "job":
        return "Job";
      case "client":
        return "Client";
      case "property":
        return "Property";
      case "staff":
        return "Staff";
      default:
        return type;
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center border-b border-border px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            placeholder="Search jobs, clients, properties..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`ml-2 ${hasActiveFilters ? "text-primary" : ""}`}
              >
                <Filter className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="ml-1 text-xs">
                    {Object.values(filters).filter(Boolean).length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Job Status</Label>
                  <Select
                    value={filters.status || ""}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: value || undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assigned Staff</Label>
                  <Select
                    value={filters.staffId || ""}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        staffId: value || undefined,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.user_id} value={staff.user_id}>
                          {staff.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input
                      type="date"
                      value={filters.dateTo || ""}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value || undefined,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <CommandList>
          {!loading && query && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {results.length > 0 && (
            <>
          {["job", "client", "property", "staff"].map((type) => {
                const typeResults = results.filter((r) => r.type === type);
                if (typeResults.length === 0) return null;

                return (
                  <CommandGroup key={type} heading={getTypeLabel(type) + "s"}>
                    {typeResults.map((result) => (
                      <CommandItem
                        key={`${result.type}-${result.id}`}
                        value={`${result.type}-${result.id}`}
                        onSelect={() => handleSelect(result)}
                        className="cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 w-full">
                          {getIcon(result.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{result.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          </div>
                          
                          {/* Quick Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(result.type === "client" || result.type === "staff") && result.metadata?.phone && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => handleQuickAction(e, "call", { phone: result.metadata?.phone })}
                                title="Call"
                              >
                                <Phone className="h-3.5 w-3.5 text-green-500" />
                              </Button>
                            )}
                            {(result.type === "client" || result.type === "staff") && result.metadata?.email && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => handleQuickAction(e, "email", { email: result.metadata?.email })}
                                title="Email"
                              >
                                <Mail className="h-3.5 w-3.5 text-blue-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => handleQuickAction(e, "view", { type: result.type })}
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>

                          {result.metadata?.status && (
                            <Badge
                              variant="outline"
                              className={STATUS_COLORS[result.metadata.status]}
                            >
                              {STATUS_OPTIONS.find(
                                (s) => s.value === result.metadata?.status
                              )?.label || result.metadata.status}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </>
          )}

          {!query && !hasActiveFilters && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type to search or use filters
            </div>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
