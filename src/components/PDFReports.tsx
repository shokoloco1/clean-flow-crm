import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileText, Users, AlertTriangle, Briefcase, Loader2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'jobs' | 'staff' | 'alerts' | 'job-detail';

interface DateRange {
  startDate: string;
  endDate: string;
}

export function PDFReports() {
  const [reportType, setReportType] = useState<ReportType>('jobs');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const setPresetRange = (preset: 'week' | 'month' | 'quarter') => {
    const today = new Date();
    let startDate: Date;
    
    switch (preset) {
      case 'week':
        startDate = subDays(today, 7);
        break;
      case 'month':
        startDate = subDays(today, 30);
        break;
      case 'quarter':
        startDate = subDays(today, 90);
        break;
    }
    
    setDateRange({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd')
    });
  };

  const createPDFHeader = (doc: jsPDF, title: string, dateRange: DateRange) => {
    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 22);
    
    // Date range subtitle
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Period: ${format(new Date(dateRange.startDate), 'dd MMM yyyy')} - ${format(new Date(dateRange.endDate), 'dd MMM yyyy')}`,
      14, 30
    );
    
    // Generation date
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 36);
    
    return 45; // Return Y position after header
  };

  const generateJobsPDF = async () => {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .gte('scheduled_date', dateRange.startDate)
      .lte('scheduled_date', dateRange.endDate)
      .order('scheduled_date', { ascending: false });

    if (error) throw error;

    // Fetch related data
    const staffIds = [...new Set(jobs?.filter(j => j.assigned_staff_id).map(j => j.assigned_staff_id))] as string[];
    const propertyIds = [...new Set(jobs?.filter(j => j.property_id).map(j => j.property_id))] as string[];

    const [staffResult, propertiesResult] = await Promise.all([
      staffIds.length > 0 
        ? supabase.from('profiles').select('user_id, full_name').in('user_id', staffIds)
        : { data: [] as { user_id: string; full_name: string }[] },
      propertyIds.length > 0
        ? supabase.from('properties').select('id, name').in('id', propertyIds)
        : { data: [] as { id: string; name: string }[] }
    ]);

    const staffMap = new Map<string, string>();
    staffResult.data?.forEach(s => staffMap.set(s.user_id, s.full_name));
    
    const propertyMap = new Map<string, string>();
    propertiesResult.data?.forEach(p => propertyMap.set(p.id, p.name));

    const doc = new jsPDF();
    const startY = createPDFHeader(doc, 'Jobs Report', dateRange);

    // Summary stats
    const completed = jobs?.filter(j => j.status === 'completed').length || 0;
    const pending = jobs?.filter(j => j.status === 'pending').length || 0;
    const inProgress = jobs?.filter(j => j.status === 'in_progress').length || 0;
    const cancelled = jobs?.filter(j => j.status === 'cancelled').length || 0;

    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Summary', 14, startY);
    
    doc.setFontSize(10);
    doc.text(`Total: ${jobs?.length || 0} | Completed: ${completed} | Pending: ${pending} | In Progress: ${inProgress} | Cancelled: ${cancelled}`, 14, startY + 7);

    const statusLabels: Record<string, string> = {
      'completed': 'Completed',
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'cancelled': 'Cancelled'
    };

    // Table
    const tableData = jobs?.map(job => {
      const duration = job.start_time && job.end_time 
        ? Math.round((new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 60000)
        : '-';

      return [
        format(new Date(job.scheduled_date), 'dd/MM/yy'),
        job.scheduled_time.slice(0, 5),
        propertyMap.get(job.property_id || '') || job.location.slice(0, 20),
        staffMap.get(job.assigned_staff_id || '') || 'Unassigned',
        statusLabels[job.status] || job.status,
        typeof duration === 'number' ? `${duration}m` : duration,
        job.quality_score ? `${job.quality_score}%` : '-'
      ];
    }) || [];

    autoTable(doc, {
      startY: startY + 14,
      head: [['Date', 'Time', 'Location', 'Staff', 'Status', 'Duration', 'Quality']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 15 },
        2: { cellWidth: 45 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 18 }
      }
    });

    return doc;
  };

  const generateStaffPDF = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, phone, hire_date')
      .order('full_name');

    if (profilesError) throw profilesError;

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, assigned_staff_id, status, start_time, end_time, quality_score')
      .gte('scheduled_date', dateRange.startDate)
      .lte('scheduled_date', dateRange.endDate);

    const { data: alerts } = await supabase
      .from('job_alerts')
      .select('job_id, alert_type')
      .gte('created_at', `${dateRange.startDate}T00:00:00`)
      .lte('created_at', `${dateRange.endDate}T23:59:59`);

    const jobStaffMap = new Map(jobs?.map(j => [j.id, j.assigned_staff_id]) || []);

    const staffStats = profiles?.map(profile => {
      const staffJobs = jobs?.filter(j => j.assigned_staff_id === profile.user_id) || [];
      const completedJobs = staffJobs.filter(j => j.status === 'completed');
      const staffAlerts = alerts?.filter(a => jobStaffMap.get(a.job_id) === profile.user_id) || [];

      const avgQuality = completedJobs.length > 0
        ? completedJobs.reduce((sum, j) => sum + (j.quality_score || 0), 0) / completedJobs.filter(j => j.quality_score).length
        : 0;

      const totalMinutes = completedJobs.reduce((sum, j) => {
        if (j.start_time && j.end_time) {
          return sum + (new Date(j.end_time).getTime() - new Date(j.start_time).getTime()) / 60000;
        }
        return sum;
      }, 0);

      return {
        name: profile.full_name,
        totalJobs: staffJobs.length,
        completed: completedJobs.length,
        quality: avgQuality ? avgQuality.toFixed(0) + '%' : 'N/A',
        hours: (totalMinutes / 60).toFixed(1) + 'h',
        alerts: staffAlerts.length
      };
    }) || [];

    const doc = new jsPDF();
    const startY = createPDFHeader(doc, 'Staff Performance Report', dateRange);

    const tableData = staffStats.map(s => [
      s.name,
      s.totalJobs.toString(),
      s.completed.toString(),
      s.quality,
      s.hours,
      s.alerts.toString()
    ]);

    autoTable(doc, {
      startY,
      head: [['Staff', 'Total Jobs', 'Completed', 'Avg Quality', 'Hours', 'Alerts']],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    return doc;
  };

  const generateAlertsPDF = async () => {
    const { data: alerts, error } = await supabase
      .from('job_alerts')
      .select('*')
      .gte('created_at', `${dateRange.startDate}T00:00:00`)
      .lte('created_at', `${dateRange.endDate}T23:59:59`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const jobIds = [...new Set(alerts?.map(a => a.job_id))];
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, location, assigned_staff_id')
      .in('id', jobIds);

    const staffIds = [...new Set(jobs?.filter(j => j.assigned_staff_id).map(j => j.assigned_staff_id))] as string[];
    const { data: profiles } = staffIds.length > 0
      ? await supabase.from('profiles').select('user_id, full_name').in('user_id', staffIds)
      : { data: [] as { user_id: string; full_name: string }[] };

    const jobMap = new Map(jobs?.map(j => [j.id, j]) || []);
    const staffMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

    const alertTypeLabels: Record<string, string> = {
      'late_arrival': 'Late Arrival',
      'early_departure': 'Early Departure',
      'geofence_violation': 'Geofence Violation',
      'no_show': 'No Show'
    };

    const doc = new jsPDF();
    const startY = createPDFHeader(doc, 'Alerts Report', dateRange);

    // Summary by type
    const alertsByType = alerts?.reduce((acc, a) => {
      acc[a.alert_type] = (acc[a.alert_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    doc.setFontSize(11);
    doc.text('Summary by Type:', 14, startY);
    doc.setFontSize(9);
    let summaryY = startY + 6;
    Object.entries(alertsByType).forEach(([type, count]) => {
      doc.text(`• ${alertTypeLabels[type] || type}: ${count}`, 14, summaryY);
      summaryY += 5;
    });

    const tableData = alerts?.map(alert => {
      const job = jobMap.get(alert.job_id);
      const staffName = job ? staffMap.get(job.assigned_staff_id || '') : '';
      return [
        format(new Date(alert.created_at), 'dd/MM/yy HH:mm'),
        alertTypeLabels[alert.alert_type] || alert.alert_type,
        staffName || '-',
        job?.location?.slice(0, 25) || '-',
        alert.is_resolved ? 'Yes' : 'No'
      ];
    }) || [];

    autoTable(doc, {
      startY: summaryY + 5,
      head: [['Date/Time', 'Type', 'Staff', 'Location', 'Resolved']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      alternateRowStyles: { fillColor: [254, 242, 242] }
    });

    return doc;
  };

  const generateJobDetailPDF = async () => {
    // Get completed jobs with all details
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'completed')
      .gte('scheduled_date', dateRange.startDate)
      .lte('scheduled_date', dateRange.endDate)
      .order('scheduled_date', { ascending: false })
      .limit(10);

    if (error) throw error;

    const jobIds = jobs?.map(j => j.id) || [];
    
    const [photosResult, checklistResult, staffResult, propertiesResult] = await Promise.all([
      supabase.from('job_photos').select('*').in('job_id', jobIds),
      supabase.from('checklist_items').select('*').in('job_id', jobIds),
      supabase.from('profiles').select('user_id, full_name').in('user_id', 
        [...new Set(jobs?.filter(j => j.assigned_staff_id).map(j => j.assigned_staff_id))] as string[]
      ),
      supabase.from('properties').select('id, name, address').in('id',
        [...new Set(jobs?.filter(j => j.property_id).map(j => j.property_id))] as string[]
      )
    ]);

    const staffMap = new Map(staffResult.data?.map(s => [s.user_id, s.full_name]) || []);
    const propertyMap = new Map(propertiesResult.data?.map(p => [p.id, p]) || []);

    const doc = new jsPDF();
    const startY = createPDFHeader(doc, 'Completed Jobs Detailed Report', dateRange);

    let currentY = startY;

    jobs?.forEach((job, index) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      const property = propertyMap.get(job.property_id || '');
      const staffName = staffMap.get(job.assigned_staff_id || '') || 'Unassigned';
      const jobPhotos = photosResult.data?.filter(p => p.job_id === job.id) || [];
      const jobChecklist = checklistResult.data?.filter(c => c.job_id === job.id) || [];
      
      const duration = job.start_time && job.end_time 
        ? Math.round((new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 60000)
        : null;

      // Job header
      doc.setFillColor(240, 240, 240);
      doc.rect(14, currentY, 182, 8, 'F');
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);
      doc.text(`Trabajo #${index + 1}: ${property?.name || job.location}`, 16, currentY + 6);
      currentY += 12;

      // Job details
      doc.setFontSize(9);
      doc.text(`Date: ${format(new Date(job.scheduled_date), 'dd/MM/yyyy')} | Time: ${job.scheduled_time.slice(0, 5)}`, 14, currentY);
      currentY += 5;
      doc.text(`Staff: ${staffName} | Duration: ${duration ? `${duration} min` : 'N/A'} | Quality: ${job.quality_score || 'N/A'}%`, 14, currentY);
      currentY += 5;
      doc.text(`GPS Validated: ${job.geofence_validated ? 'Yes' : 'No'}`, 14, currentY);
      currentY += 5;

      // Checklist summary
      if (jobChecklist.length > 0) {
        const completed = jobChecklist.filter(c => c.status === 'completed').length;
        const issues = jobChecklist.filter(c => c.status === 'issue').length;
        doc.text(`Checklist: ${completed}/${jobChecklist.length} completed, ${issues} issues`, 14, currentY);
        currentY += 5;
      }

      // Photos count
      const beforePhotos = jobPhotos.filter(p => p.photo_type === 'before').length;
      const afterPhotos = jobPhotos.filter(p => p.photo_type === 'after').length;
      doc.text(`Photos: ${beforePhotos} before, ${afterPhotos} after`, 14, currentY);
      currentY += 10;
    });

    return doc;
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      let doc: jsPDF;
      let filename: string;

      switch (reportType) {
        case 'jobs':
          doc = await generateJobsPDF();
          filename = `jobs_${dateRange.startDate}_${dateRange.endDate}.pdf`;
          break;
        case 'staff':
          doc = await generateStaffPDF();
          filename = `staff_performance_${dateRange.startDate}_${dateRange.endDate}.pdf`;
          break;
        case 'alerts':
          doc = await generateAlertsPDF();
          filename = `alerts_${dateRange.startDate}_${dateRange.endDate}.pdf`;
          break;
        case 'job-detail':
          doc = await generateJobDetailPDF();
          filename = `job_details_${dateRange.startDate}_${dateRange.endDate}.pdf`;
          break;
        default:
          throw new Error('Invalid report type');
      }

      doc.save(filename);
      toast.success('PDF report generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error generating PDF report');
    } finally {
      setIsGenerating(false);
    }
  };

  const reportOptions = [
    { value: 'jobs', label: 'Job History', icon: Briefcase, description: 'Summary of all jobs with status and duration' },
    { value: 'staff', label: 'Staff Performance', icon: Users, description: 'Statistics and metrics per employee' },
    { value: 'alerts', label: 'Generated Alerts', icon: AlertTriangle, description: 'Alert history by type and status' },
    { value: 'job-detail', label: 'Job Details', icon: ClipboardCheck, description: 'Complete report with checklist and photos' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          PDF Reports
        </CardTitle>
        <CardDescription>
          Generate professional reports in PDF format
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Type Selection */}
        <div className="space-y-3">
          <Label>Report Type</Label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {reportOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setReportType(option.value as ReportType)}
                className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all hover:bg-accent ${
                  reportType === option.value 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <option.icon className={`h-4 w-4 ${reportType === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium text-sm">{option.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-3">
          <Label>Date Range</Label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setPresetRange('week')}>
              Last Week
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPresetRange('month')}>
              Last Month
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPresetRange('quarter')}>
              Last 3 Months
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pdfStartDate">From</Label>
              <Input
                id="pdfStartDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdfEndDate">To</Label>
              <Input
                id="pdfEndDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerateReport} 
          disabled={isGenerating}
          className="w-full sm:w-auto"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
