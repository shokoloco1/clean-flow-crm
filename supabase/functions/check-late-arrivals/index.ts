import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Check for authorization - either admin user or cron secret
    const authHeader = req.headers.get('Authorization');
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');
    
    // Allow access via cron secret (for scheduled jobs)
    const isCronRequest = expectedCronSecret && cronSecret === expectedCronSecret;
    
    if (!isCronRequest) {
      // Require user authentication for non-cron requests
      if (!authHeader?.startsWith('Bearer ')) {
        console.log('[check-late-arrivals] Unauthorized: No auth header');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify the user is an admin
      const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await authedClient.auth.getClaims(token);
      
      if (claimsError || !claimsData?.claims) {
        console.log('[check-late-arrivals] Unauthorized: Invalid token');
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userId = claimsData.claims.sub;
      
      // Check admin role using service client
      const adminCheckClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: roleData } = await adminCheckClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleData?.role !== 'admin') {
        console.log('[check-late-arrivals] Forbidden: Admin access required');
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    console.log(`[check-late-arrivals] Running at ${now.toISOString()}`);
    console.log(`[check-late-arrivals] Today: ${today}, Current time: ${currentTime}`);

    // Get all pending jobs scheduled for today that should have started by now
    const { data: pendingJobs, error: jobsError } = await supabase
      .from('jobs')
      .select(`id, scheduled_time, location, assigned_staff_id`)
      .eq('scheduled_date', today)
      .eq('status', 'pending')
      .lte('scheduled_time', currentTime);

    if (jobsError) {
      console.error('[check-late-arrivals] Error fetching jobs:', jobsError);
      throw jobsError;
    }

    console.log(`[check-late-arrivals] Found ${pendingJobs?.length || 0} pending jobs that should have started`);

    // Fetch staff names separately
    const staffIds = [...new Set((pendingJobs || []).map(j => j.assigned_staff_id).filter(Boolean))];
    let staffMap: Record<string, string> = {};
    if (staffIds.length > 0) {
      const { data: staffData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', staffIds);
      staffMap = Object.fromEntries((staffData || []).map(s => [s.user_id, s.full_name]));
    }

    const alertsCreated: string[] = [];

    for (const job of pendingJobs || []) {
      // Calculate how late they are
      const [scheduledHour, scheduledMin] = job.scheduled_time.split(':').map(Number);
      const scheduledDate = new Date(today);
      scheduledDate.setHours(scheduledHour, scheduledMin, 0, 0);
      
      const diffMinutes = Math.floor((now.getTime() - scheduledDate.getTime()) / (1000 * 60));
      
      console.log(`[check-late-arrivals] Job ${job.id}: scheduled ${job.scheduled_time}, ${diffMinutes} minutes late`);

      // Check if an alert already exists for this job today
      const { data: existingAlerts } = await supabase
        .from('job_alerts')
        .select('id, alert_type')
        .eq('job_id', job.id)
        .gte('created_at', `${today}T00:00:00`)
        .in('alert_type', ['late_arrival', 'no_show']);

      const hasLateAlert = existingAlerts?.some(a => a.alert_type === 'late_arrival');
      const hasNoShowAlert = existingAlerts?.some(a => a.alert_type === 'no_show');

      const staffName = job.assigned_staff_id ? staffMap[job.assigned_staff_id] || 'Staff desconocido' : 'Staff desconocido';

      // No-show: > 30 minutes late
      if (diffMinutes >= 30 && !hasNoShowAlert) {
        const { error: alertError } = await supabase
          .from('job_alerts')
          .insert({
            job_id: job.id,
            alert_type: 'no_show',
            message: `${staffName} no se ha presentado al trabajo. ${diffMinutes} minutos de retraso. Ubicación: ${job.location}`
          });

        if (!alertError) {
          alertsCreated.push(`no_show:${job.id}`);
          console.log(`[check-late-arrivals] Created no_show alert for job ${job.id}`);
        }
      }
      // Late arrival: > 15 minutes late (but not yet no-show)
      else if (diffMinutes >= 15 && diffMinutes < 30 && !hasLateAlert) {
        const { error: alertError } = await supabase
          .from('job_alerts')
          .insert({
            job_id: job.id,
            alert_type: 'late_arrival',
            message: `${staffName} tiene ${diffMinutes} minutos de retraso. Ubicación: ${job.location}`
          });

        if (!alertError) {
          alertsCreated.push(`late_arrival:${job.id}`);
          console.log(`[check-late-arrivals] Created late_arrival alert for job ${job.id}`);
        }
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      jobsChecked: pendingJobs?.length || 0,
      alertsCreated: alertsCreated.length,
      alerts: alertsCreated
    };

    console.log(`[check-late-arrivals] Summary:`, summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[check-late-arrivals] Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
