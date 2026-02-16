import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  const isAllowed =
    origin === 'https://pulcrix.com' ||
    origin === 'http://localhost:8080' ||
    origin === 'http://localhost:3000' ||
    origin.endsWith('.lovable.app');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://pulcrix.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

interface RecurringSchedule {
  id: string
  client_id: string | null
  property_id: string | null
  assigned_staff_id: string | null
  location: string
  scheduled_time: string
  notes: string | null
  checklist: string[]
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  days_of_week: number[]
  day_of_month: number | null
  is_active: boolean
  last_generated_date: string | null
  next_generation_date: string | null
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    // Check for authorization - either admin user or cron secret
    const authHeader = req.headers.get('Authorization')
    const cronSecret = req.headers.get('X-Cron-Secret')
    const expectedCronSecret = Deno.env.get('CRON_SECRET')
    
    // Allow access via cron secret (for scheduled jobs)
    const isCronRequest = expectedCronSecret && cronSecret === expectedCronSecret
    
    if (!isCronRequest) {
      // Require user authentication for non-cron requests
      if (!authHeader?.startsWith('Bearer ')) {
        console.log('[generate-recurring-jobs] Unauthorized: No auth header')
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Verify the user is an admin
      const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      })

      const token = authHeader.replace('Bearer ', '')
      const { data: claimsData, error: claimsError } = await authedClient.auth.getClaims(token)
      
      if (claimsError || !claimsData?.claims) {
        console.log('[generate-recurring-jobs] Unauthorized: Invalid token')
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const userId = claimsData.claims.sub
      
      // Check admin role using service client
      const adminCheckClient = createClient(supabaseUrl, supabaseServiceKey)
      const { data: roleData } = await adminCheckClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()

      if (roleData?.role !== 'admin') {
        console.log('[generate-recurring-jobs] Forbidden: Admin access required')
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const dayOfMonth = today.getDate()

    console.log(`[generate-recurring-jobs] Starting for date: ${todayStr}, dayOfWeek: ${dayOfWeek}, dayOfMonth: ${dayOfMonth}`)

    // Fetch all active recurring schedules
    const { data: schedules, error: fetchError } = await supabase
      .from('recurring_schedules')
      .select('*')
      .eq('is_active', true)

    if (fetchError) {
      console.error('Error fetching schedules:', fetchError)
      throw fetchError
    }

    console.log(`[generate-recurring-jobs] Found ${schedules?.length || 0} active schedules`)

    const jobsToCreate: any[] = []
    const schedulesToUpdate: { id: string; last_generated_date: string; next_generation_date: string }[] = []

    for (const schedule of (schedules as RecurringSchedule[]) || []) {
      // Skip if already generated today
      if (schedule.last_generated_date === todayStr) {
        console.log(`[generate-recurring-jobs] Schedule ${schedule.id} already generated today, skipping`)
        continue
      }

      let shouldGenerate = false
      let nextDate = todayStr

      switch (schedule.frequency) {
        case 'daily':
          shouldGenerate = true
          // Next generation is tomorrow
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          nextDate = tomorrow.toISOString().split('T')[0]
          break

        case 'weekly':
          // Check if today is one of the scheduled days
          shouldGenerate = schedule.days_of_week.includes(dayOfWeek)
          if (shouldGenerate) {
            // Find next occurrence
            const nextWeekDay = new Date(today)
            nextWeekDay.setDate(nextWeekDay.getDate() + 7)
            nextDate = nextWeekDay.toISOString().split('T')[0]
          }
          break

        case 'biweekly':
          // Similar to weekly but every 2 weeks
          shouldGenerate = schedule.days_of_week.includes(dayOfWeek)
          if (shouldGenerate && schedule.last_generated_date) {
            const lastGen = new Date(schedule.last_generated_date)
            const daysSinceLastGen = Math.floor((today.getTime() - lastGen.getTime()) / (1000 * 60 * 60 * 24))
            shouldGenerate = daysSinceLastGen >= 14
          }
          if (shouldGenerate) {
            const next = new Date(today)
            next.setDate(next.getDate() + 14)
            nextDate = next.toISOString().split('T')[0]
          }
          break

        case 'monthly':
          // Check if today is the scheduled day of month
          shouldGenerate = schedule.day_of_month === dayOfMonth
          if (shouldGenerate) {
            // Next month same day
            const next = new Date(today)
            next.setMonth(next.getMonth() + 1)
            nextDate = next.toISOString().split('T')[0]
          }
          break
      }

      if (shouldGenerate) {
        console.log(`[generate-recurring-jobs] Generating job for schedule ${schedule.id}`)

        jobsToCreate.push({
          client_id: schedule.client_id,
          property_id: schedule.property_id,
          assigned_staff_id: schedule.assigned_staff_id,
          location: schedule.location,
          scheduled_date: todayStr,
          scheduled_time: schedule.scheduled_time,
          notes: schedule.notes,
          checklist: schedule.checklist,
          status: 'pending',
        })

        schedulesToUpdate.push({
          id: schedule.id,
          last_generated_date: todayStr,
          next_generation_date: nextDate,
        })
      }
    }

    // Create all jobs
    if (jobsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('jobs')
        .insert(jobsToCreate)

      if (insertError) {
        console.error('Error creating jobs:', insertError)
        throw insertError
      }

      console.log(`[generate-recurring-jobs] Created ${jobsToCreate.length} jobs`)
    }

    // Update schedules with last generated date
    for (const update of schedulesToUpdate) {
      const { error: updateError } = await supabase
        .from('recurring_schedules')
        .update({
          last_generated_date: update.last_generated_date,
          next_generation_date: update.next_generation_date,
        })
        .eq('id', update.id)

      if (updateError) {
        console.error(`Error updating schedule ${update.id}:`, updateError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobsCreated: jobsToCreate.length,
        date: todayStr,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: unknown) {
    console.error('Error in generate-recurring-jobs:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
