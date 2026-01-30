import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { DollarSign, TrendingUp, Users, Award, Loader2 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface RevenueData {
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  invoiceCount: number;
}

interface JobStats {
  completed: number;
  cancelled: number;
  pending: number;
  inProgress: number;
}

interface TopClient {
  name: string;
  revenue: number;
  jobCount: number;
}

interface TopStaff {
  name: string;
  completed: number;
  avgDuration: number;
}

const COLORS = ['hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'];

export function BusinessMetricsDashboard() {
  const [period, setPeriod] = useState<'month' | '30' | '90'>('month');
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueData>({ totalRevenue: 0, paidRevenue: 0, pendingRevenue: 0, invoiceCount: 0 });
  const [jobStats, setJobStats] = useState<JobStats>({ completed: 0, cancelled: 0, pending: 0, inProgress: 0 });
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [topStaff, setTopStaff] = useState<TopStaff[]>([]);

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    if (period === 'month') {
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd')
      };
    }
    return {
      start: format(subDays(now, parseInt(period)), 'yyyy-MM-dd'),
      end: format(now, 'yyyy-MM-dd')
    };
  };

  const fetchMetrics = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    try {
      // Fetch invoices for revenue
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total, status, client_id')
        .gte('issue_date', start)
        .lte('issue_date', end);

      // Fetch jobs for job stats
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, status, assigned_staff_id, client_id, start_time, end_time')
        .gte('scheduled_date', start)
        .lte('scheduled_date', end);

      // Fetch clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name');

      // Fetch staff profiles
      const staffIds = [...new Set(jobs?.filter(j => j.assigned_staff_id).map(j => j.assigned_staff_id))] as string[];
      const { data: profiles } = staffIds.length > 0
        ? await supabase.from('profiles').select('user_id, full_name').in('user_id', staffIds)
        : { data: [] };

      // Calculate revenue
      const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
      const paidRevenue = invoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
      const pendingRevenue = invoices?.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
      
      setRevenue({
        totalRevenue,
        paidRevenue,
        pendingRevenue,
        invoiceCount: invoices?.length || 0
      });

      // Calculate job stats
      const completed = jobs?.filter(j => j.status === 'completed').length || 0;
      const cancelled = jobs?.filter(j => j.status === 'cancelled').length || 0;
      const pending = jobs?.filter(j => j.status === 'pending').length || 0;
      const inProgress = jobs?.filter(j => j.status === 'in_progress').length || 0;

      setJobStats({ completed, cancelled, pending, inProgress });

      // Calculate top clients by revenue
      const clientMap = new Map(clients?.map(c => [c.id, c.name]) || []);
      const clientRevenue: Record<string, { name: string; revenue: number; jobCount: number }> = {};
      
      invoices?.forEach(inv => {
        if (inv.client_id) {
          const name = clientMap.get(inv.client_id) || 'Unknown';
          if (!clientRevenue[inv.client_id]) {
            clientRevenue[inv.client_id] = { name, revenue: 0, jobCount: 0 };
          }
          clientRevenue[inv.client_id].revenue += Number(inv.total);
        }
      });

      // Count jobs per client
      jobs?.forEach(job => {
        if (job.client_id && clientRevenue[job.client_id]) {
          clientRevenue[job.client_id].jobCount++;
        }
      });

      const sortedClients = Object.values(clientRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      
      setTopClients(sortedClients);

      // Calculate top staff by productivity
      const staffMap = new Map<string, string>();
      profiles?.forEach(p => staffMap.set(p.user_id, p.full_name));
      
      const staffStats: Record<string, { name: string; completed: number; totalDuration: number; count: number }> = {};

      jobs?.filter(j => j.status === 'completed' && j.assigned_staff_id).forEach(job => {
        const staffId = job.assigned_staff_id!;
        const name = staffMap.get(staffId) || 'Unknown';
        
        if (!staffStats[staffId]) {
          staffStats[staffId] = { name, completed: 0, totalDuration: 0, count: 0 };
        }
        
        staffStats[staffId].completed++;
        
        if (job.start_time && job.end_time) {
          const duration = (new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 60000;
          staffStats[staffId].totalDuration += duration;
          staffStats[staffId].count++;
        }
      });

      const sortedStaff = Object.values(staffStats)
        .map(s => ({
          name: s.name,
          completed: s.completed,
          avgDuration: s.count > 0 ? Math.round(s.totalDuration / s.count) : 0
        }))
        .sort((a, b) => b.completed - a.completed)
        .slice(0, 5);

      setTopStaff(sortedStaff);

    } catch (error) {
      console.error('Error fetching business metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
  };

  const jobChartData = [
    { name: 'Completed', value: jobStats.completed, fill: COLORS[0] },
    { name: 'Cancelled', value: jobStats.cancelled, fill: COLORS[1] },
    { name: 'Pending', value: jobStats.pending, fill: COLORS[2] },
    { name: 'In Progress', value: jobStats.inProgress, fill: COLORS[3] },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Business Metrics
          </h2>
          <p className="text-muted-foreground">Revenue, jobs, and team performance</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as 'month' | '30' | '90')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(revenue.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(revenue.paidRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(revenue.pendingRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Invoices</p>
                <p className="text-lg font-bold text-foreground">{revenue.invoiceCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Jobs Status Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {jobChartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={jobChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {jobChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No jobs in this period
              </div>
            )}
            <div className="flex justify-center gap-4 mt-2 text-sm">
              <span className="text-success font-medium">✓ {jobStats.completed} completed</span>
              <span className="text-destructive font-medium">✗ {jobStats.cancelled} cancelled</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top 5 Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClients} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 11 }}
                      width={80}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No client data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Staff */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4" />
            Most Productive Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topStaff.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {topStaff.map((staff, index) => (
                <div 
                  key={staff.name}
                  className={`p-4 rounded-lg border ${index === 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-lg font-bold ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                      #{index + 1}
                    </span>
                    {index === 0 && <span className="text-sm">🏆</span>}
                  </div>
                  <p className="font-medium text-foreground truncate">{staff.name}</p>
                  <p className="text-sm text-muted-foreground">{staff.completed} jobs</p>
                  {staff.avgDuration > 0 && (
                    <p className="text-xs text-muted-foreground">~{staff.avgDuration} min avg</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No completed jobs in this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
