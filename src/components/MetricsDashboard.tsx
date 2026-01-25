import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { TrendingUp, Users, Clock, AlertTriangle, CheckCircle, BarChart3, Loader2 } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { t } from '@/lib/i18n';

interface JobsPerDay {
  date: string;
  completed: number;
  pending: number;
  inProgress: number;
  total: number;
}

interface StaffPerformance {
  name: string;
  completed: number;
  avgDuration: number;
  avgQuality: number;
  alerts: number;
}

interface AlertDistribution {
  type: string;
  count: number;
  label: string;
}

interface KPIData {
  totalJobs: number;
  completedJobs: number;
  completionRate: number;
  avgDuration: number;
  totalAlerts: number;
  resolvedAlerts: number;
  avgQuality: number;
  onTimeRate: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

export function MetricsDashboard() {
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);
  const [jobsPerDay, setJobsPerDay] = useState<JobsPerDay[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [alertDistribution, setAlertDistribution] = useState<AlertDistribution[]>([]);
  const [kpis, setKpis] = useState<KPIData>({
    totalJobs: 0,
    completedJobs: 0,
    completionRate: 0,
    avgDuration: 0,
    totalAlerts: 0,
    resolvedAlerts: 0,
    avgQuality: 0,
    onTimeRate: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const fetchMetrics = async () => {
    setLoading(true);
    const startDate = format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd');
    const endDate = format(new Date(), 'yyyy-MM-dd');

    try {
      // Fetch jobs data
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, status, scheduled_date, start_time, end_time, quality_score, assigned_staff_id, scheduled_time')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (jobsError) throw jobsError;

      // Fetch alerts data
      const { data: alerts, error: alertsError } = await supabase
        .from('job_alerts')
        .select('id, alert_type, is_resolved, job_id, created_at')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      if (alertsError) throw alertsError;

      // Fetch staff profiles
      const staffIds = [...new Set(jobs?.filter(j => j.assigned_staff_id).map(j => j.assigned_staff_id))] as string[];
      const { data: profiles } = staffIds.length > 0
        ? await supabase.from('profiles').select('user_id, full_name').in('user_id', staffIds)
        : { data: [] as { user_id: string; full_name: string }[] };

      const staffMap = new Map<string, string>();
      profiles?.forEach(p => staffMap.set(p.user_id, p.full_name));

      // Calculate KPIs
      const completedJobs = jobs?.filter(j => j.status === 'completed') || [];
      const jobsWithDuration = completedJobs.filter(j => j.start_time && j.end_time);
      const avgDuration = jobsWithDuration.length > 0
        ? jobsWithDuration.reduce((sum, j) => {
            return sum + (new Date(j.end_time!).getTime() - new Date(j.start_time!).getTime()) / 60000;
          }, 0) / jobsWithDuration.length
        : 0;

      const jobsWithQuality = completedJobs.filter(j => j.quality_score !== null);
      const avgQuality = jobsWithQuality.length > 0
        ? jobsWithQuality.reduce((sum, j) => sum + (j.quality_score || 0), 0) / jobsWithQuality.length
        : 0;

      // Calculate on-time rate (jobs started within 15 mins of scheduled time)
      const jobsWithStartTime = completedJobs.filter(j => j.start_time && j.scheduled_time);
      const onTimeJobs = jobsWithStartTime.filter(j => {
        const scheduledDateTime = new Date(`${j.scheduled_date}T${j.scheduled_time}`);
        const actualStart = new Date(j.start_time!);
        const diffMinutes = (actualStart.getTime() - scheduledDateTime.getTime()) / 60000;
        return diffMinutes <= 15;
      });
      const onTimeRate = jobsWithStartTime.length > 0
        ? (onTimeJobs.length / jobsWithStartTime.length) * 100
        : 0;

      setKpis({
        totalJobs: jobs?.length || 0,
        completedJobs: completedJobs.length,
        completionRate: jobs?.length ? (completedJobs.length / jobs.length) * 100 : 0,
        avgDuration: Math.round(avgDuration),
        totalAlerts: alerts?.length || 0,
        resolvedAlerts: alerts?.filter(a => a.is_resolved).length || 0,
        avgQuality: Math.round(avgQuality * 10) / 10,
        onTimeRate: Math.round(onTimeRate)
      });

      // Calculate jobs per day
      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
      });

      const jobsByDay = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayJobs = jobs?.filter(j => j.scheduled_date === dayStr) || [];
        return {
          date: format(day, 'dd MMM'),
          completed: dayJobs.filter(j => j.status === 'completed').length,
          pending: dayJobs.filter(j => j.status === 'pending').length,
          inProgress: dayJobs.filter(j => j.status === 'in_progress').length,
          total: dayJobs.length
        };
      });
      setJobsPerDay(jobsByDay);

      // Calculate staff performance
      const staffStats = staffIds.map(staffId => {
        const staffJobs = jobs?.filter(j => j.assigned_staff_id === staffId) || [];
        const staffCompleted = staffJobs.filter(j => j.status === 'completed');
        const staffWithDuration = staffCompleted.filter(j => j.start_time && j.end_time);
        const staffWithQuality = staffCompleted.filter(j => j.quality_score !== null);
        
        const avgDur = staffWithDuration.length > 0
          ? staffWithDuration.reduce((sum, j) => {
              return sum + (new Date(j.end_time!).getTime() - new Date(j.start_time!).getTime()) / 60000;
            }, 0) / staffWithDuration.length
          : 0;

        const avgQual = staffWithQuality.length > 0
          ? staffWithQuality.reduce((sum, j) => sum + (j.quality_score || 0), 0) / staffWithQuality.length
          : 0;

        // Count alerts for this staff
        const jobIds = staffJobs.map(j => j.id);
        const staffAlerts = alerts?.filter(a => jobIds.includes(a.job_id)).length || 0;

        return {
          name: staffMap.get(staffId) || 'Unknown',
          completed: staffCompleted.length,
          avgDuration: Math.round(avgDur),
          avgQuality: Math.round(avgQual * 10) / 10,
          alerts: staffAlerts
        };
      }).sort((a, b) => b.completed - a.completed);

      setStaffPerformance(staffStats);

      // Calculate alert distribution
      const alertTypes: Record<string, { count: number; label: string }> = {
        'late_arrival': { count: 0, label: t('lateArrival') },
        'early_departure': { count: 0, label: t('earlyCheckout') },
        'geofence_violation': { count: 0, label: t('geofenceViolation') },
        'no_show': { count: 0, label: t('noShow') }
      };

      alerts?.forEach(alert => {
        if (alertTypes[alert.alert_type]) {
          alertTypes[alert.alert_type].count++;
        }
      });

      const distribution = Object.entries(alertTypes)
        .filter(([_, data]) => data.count > 0)
        .map(([type, data]) => ({
          type,
          count: data.count,
          label: data.label
        }));

      setAlertDistribution(distribution);

    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const KPICard = ({ title, value, subtitle, icon: Icon, trend }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
            trend === 'up' ? 'bg-success/10' : 
            trend === 'down' ? 'bg-destructive/10' : 
            'bg-primary/10'
          }`}>
            <Icon className={`h-6 w-6 ${
              trend === 'up' ? 'text-success' : 
              trend === 'down' ? 'text-destructive' : 
              'text-primary'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Metrics & KPIs
          </h2>
          <p className="text-muted-foreground">Team performance analysis</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as '7' | '30' | '90')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Jobs"
          value={kpis.totalJobs}
          subtitle={`${kpis.completedJobs} completed`}
          icon={CheckCircle}
          trend="neutral"
        />
        <KPICard
          title="Completion Rate"
          value={`${Math.round(kpis.completionRate)}%`}
          subtitle="of jobs finished"
          icon={TrendingUp}
          trend={kpis.completionRate >= 80 ? 'up' : 'down'}
        />
        <KPICard
          title="Average Duration"
          value={`${kpis.avgDuration} min`}
          subtitle="per job"
          icon={Clock}
          trend="neutral"
        />
        <KPICard
          title="Punctuality"
          value={`${kpis.onTimeRate}%`}
          subtitle={`${kpis.totalAlerts} total alerts`}
          icon={AlertTriangle}
          trend={kpis.onTimeRate >= 85 ? 'up' : 'down'}
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Jobs Per Day</CardTitle>
              <CardDescription>Distribution of completed, pending and in-progress jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={jobsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      name="Completed"
                      stackId="1"
                      stroke="hsl(var(--success))" 
                      fill="hsl(var(--success))"
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="inProgress" 
                      name="In Progress"
                      stackId="1"
                      stroke="hsl(var(--warning))" 
                      fill="hsl(var(--warning))"
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pending" 
                      name="Pending"
                      stackId="1"
                      stroke="hsl(var(--muted-foreground))" 
                      fill="hsl(var(--muted))"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completion Trend</CardTitle>
              <CardDescription>Completed jobs over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={jobsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      name="Completed"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      name="Total"
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Performance Tab */}
        <TabsContent value="staff" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Jobs Completed by Staff</CardTitle>
                <CardDescription>Team productivity ranking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {staffPerformance.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffPerformance} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          width={100}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="completed" 
                          name="Completed"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No staff data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Quality by Staff</CardTitle>
                <CardDescription>Work quality score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {staffPerformance.filter(s => s.avgQuality > 0).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffPerformance.filter(s => s.avgQuality > 0)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          tick={{ fontSize: 12 }}
                          width={100}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="avgQuality" 
                          name="Quality (%)"
                          fill="hsl(var(--success))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No quality data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Details</CardTitle>
              <CardDescription>Complete performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {staffPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Employee</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Completed</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Avg Duration</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Quality</th>
                        <th className="text-center py-3 px-4 font-medium text-muted-foreground">Alerts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffPerformance.map((staff, idx) => (
                        <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-3 px-4 font-medium">{staff.name}</td>
                          <td className="py-3 px-4 text-center">{staff.completed}</td>
                          <td className="py-3 px-4 text-center">{staff.avgDuration} min</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              staff.avgQuality >= 80 ? 'bg-success/10 text-success' :
                              staff.avgQuality >= 60 ? 'bg-warning/10 text-warning' :
                              'bg-destructive/10 text-destructive'
                            }`}>
                              {staff.avgQuality > 0 ? `${staff.avgQuality}%` : 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              staff.alerts === 0 ? 'bg-success/10 text-success' :
                              staff.alerts <= 2 ? 'bg-warning/10 text-warning' :
                              'bg-destructive/10 text-destructive'
                            }`}>
                              {staff.alerts}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No staff data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert Distribution</CardTitle>
                <CardDescription>Types of incidents reported</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {alertDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={alertDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="label"
                          label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {alertDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
                        <p>No alerts in this period!</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alert Summary</CardTitle>
                <CardDescription>Resolution status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Alerts</p>
                      <p className="text-3xl font-bold">{kpis.totalAlerts}</p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-warning" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-success/10 rounded-lg">
                      <p className="text-sm text-success">Resolved</p>
                      <p className="text-2xl font-bold text-success">{kpis.resolvedAlerts}</p>
                    </div>
                    <div className="p-4 bg-destructive/10 rounded-lg">
                      <p className="text-sm text-destructive">Pending</p>
                      <p className="text-2xl font-bold text-destructive">{kpis.totalAlerts - kpis.resolvedAlerts}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Resolution Rate</span>
                      <span className="font-medium">
                        {kpis.totalAlerts > 0 
                          ? `${Math.round((kpis.resolvedAlerts / kpis.totalAlerts) * 100)}%`
                          : '100%'
                        }
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-success h-2 rounded-full transition-all"
                        style={{ 
                          width: `${kpis.totalAlerts > 0 
                            ? (kpis.resolvedAlerts / kpis.totalAlerts) * 100 
                            : 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
