import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Client } from "@/lib/queries/clients";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { enAU } from "date-fns/locale";
import {
  Users,
  Mail,
  Phone,
  FileText,
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";

interface ClientJob {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  profiles: { full_name: string } | null;
}

interface ClientStats {
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  inProgressJobs: number;
  completionRate: number;
}

interface ClientDetailSheetProps {
  client: Client | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function getStatusBadge(status: string) {
  const variants: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    pending: { variant: "secondary", label: "Pending" },
    in_progress: { variant: "default", label: "In Progress" },
    completed: { variant: "outline", label: "Completed" },
  };
  const config = variants[status] || variants.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ClientDetailSheet({ client, isOpen, onOpenChange }: ClientDetailSheetProps) {
  const { data: clientJobs = [] } = useQuery<ClientJob[]>({
    queryKey: ["client-jobs", client?.id],
    queryFn: async () => {
      if (!client) return [];
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, location, scheduled_date, scheduled_time, status, start_time, end_time, assigned_staff_id",
        )
        .eq("client_id", client.id)
        .order("scheduled_date", { ascending: false })
        .limit(50);
      if (error) throw error;

      const staffIds = [
        ...new Set(data.map((j) => j.assigned_staff_id).filter((id): id is string => id !== null)),
      ];
      let staffMap: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", staffIds);
        staffMap = Object.fromEntries((staffData || []).map((s) => [s.user_id, s.full_name]));
      }

      return data.map((job) => ({
        ...job,
        profiles: job.assigned_staff_id
          ? { full_name: staffMap[job.assigned_staff_id] || "Unassigned" }
          : null,
      })) as ClientJob[];
    },
    enabled: isOpen && !!client,
  });

  const clientStats: ClientStats = clientJobs.reduce(
    (acc, job) => {
      acc.totalJobs++;
      if (job.status === "completed") acc.completedJobs++;
      else if (job.status === "pending") acc.pendingJobs++;
      else if (job.status === "in_progress") acc.inProgressJobs++;
      return acc;
    },
    { totalJobs: 0, completedJobs: 0, pendingJobs: 0, inProgressJobs: 0, completionRate: 0 },
  );
  clientStats.completionRate =
    clientStats.totalJobs > 0
      ? Math.round((clientStats.completedJobs / clientStats.totalJobs) * 100)
      : 0;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        {client && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {client.name}
              </SheetTitle>
              <SheetDescription>
                Client since {format(new Date(client.created_at), "MMMM yyyy", { locale: enAU })}
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="info" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="jobs">Jobs</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    {client.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.abn && (
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">ABN / ID</p>
                          <span>{client.abn}</span>
                        </div>
                      </div>
                    )}
                    {client.notes && (
                      <div className="border-t pt-4">
                        <p className="mb-2 text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{client.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="jobs" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Job History</CardTitle>
                    <CardDescription>{clientJobs.length} jobs recorded</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {clientJobs.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">No jobs recorded</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Staff</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientJobs.map((job) => (
                            <TableRow key={job.id}>
                              <TableCell>
                                {format(new Date(job.scheduled_date), "dd MMM yyyy", {
                                  locale: enAU,
                                })}
                              </TableCell>
                              <TableCell className="max-w-[120px] truncate">
                                {job.location}
                              </TableCell>
                              <TableCell>{job.profiles?.full_name || "Unassigned"}</TableCell>
                              <TableCell>{getStatusBadge(job.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="stats" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-2xl font-bold">{clientStats.totalJobs}</p>
                          <p className="text-sm text-muted-foreground">Total Jobs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-2xl font-bold">{clientStats.completedJobs}</p>
                          <p className="text-sm text-muted-foreground">Completed</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="text-2xl font-bold">{clientStats.pendingJobs}</p>
                          <p className="text-sm text-muted-foreground">Pending</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-2xl font-bold">{clientStats.completionRate}%</p>
                          <p className="text-sm text-muted-foreground">Completion Rate</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
