# Resend Email Configuration Guide

This guide explains how to configure [Resend](https://resend.com) for transactional emails in Pulcrix.

## Overview

Pulcrix uses Resend for sending transactional emails including:
- Staff invitations
- Job assignments and reminders
- Payment confirmations
- Alert notifications
- Trial and subscription emails

## Prerequisites

- A Resend account (free tier includes 3,000 emails/month)
- Access to DNS settings for your domain (pulcrix.com.au)
- Supabase project with Edge Functions enabled

## Step 1: Create Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email address
3. Complete the onboarding process

## Step 2: Verify Your Domain

To send emails from `@pulcrix.com.au`, you need to verify the domain:

1. In Resend Dashboard, go to **Domains** → **Add Domain**
2. Enter: `pulcrix.com.au`
3. Add the required DNS records:

### Required DNS Records

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | `resend._domainkey` | (provided by Resend) | 3600 |
| TXT | `@` or root | `v=spf1 include:resend.com ~all` | 3600 |

### Optional but Recommended

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | `email` | `mailgun.org` | Click tracking |
| TXT | `_dmarc` | `v=DMARC1; p=none;` | DMARC policy |

4. Wait for DNS propagation (usually 5-30 minutes)
5. Click **Verify** in Resend Dashboard

## Step 3: Generate API Key

1. Go to **API Keys** → **Create API Key**
2. Name: `pulcrix-production`
3. Permission: **Full access** (or scoped to sending only)
4. Copy the API key immediately (shown only once)

> ⚠️ **Security**: Never commit API keys to version control

## Step 4: Configure Supabase Secrets

Set the Resend secrets in your Supabase project:

### Using Supabase CLI

```bash
# Set the API key
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# Set the from email
supabase secrets set RESEND_FROM_EMAIL="Pulcrix <no-reply@pulcrix.com.au>"

# Optional: Set from name separately
supabase secrets set RESEND_FROM_NAME="Pulcrix"
```

### Using Supabase Dashboard

1. Go to your project in [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Edge Functions** → **Secrets**
3. Add the following secrets:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `RESEND_FROM_EMAIL` | `Pulcrix <no-reply@pulcrix.com.au>` |
| `RESEND_FROM_NAME` | `Pulcrix` |

## Step 5: Test Email Sending

### Using curl

```bash
# Test the send-email function
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-email' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "test@example.com",
    "template": "welcome",
    "variables": {
      "name": "Test User"
    }
  }'
```

### Using Supabase Client (JavaScript)

```typescript
const { data, error } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'test@example.com',
    template: 'welcome',
    variables: {
      name: 'Test User'
    }
  }
});
```

## Available Email Templates

| Template | Description | Variables |
|----------|-------------|-----------|
| `password_reset` | Password reset link | `name`, `resetLink` |
| `welcome` | Welcome new business owner | `name` |
| `welcome_staff` | Welcome new staff member | `staffName`, `name` |
| `job_notification` | Basic job notification | `name`, `jobLocation`, `jobDate`, `jobTime` |
| `job_assigned` | Detailed job assignment | `staffName`, `clientName`, `jobLocation`, `jobDate`, `jobTime`, `jobServices` |
| `job_reminder` | 1-hour job reminder | `staffName`, `clientName`, `jobLocation`, `jobTime`, `jobServices` |
| `job_completed` | Job completion confirmation | `jobLocation`, `jobDate` |
| `payment_received` | Payment confirmation | `amount`, `invoiceNumber`, `clientName`, `jobDate` |
| `alert_notification` | Alert notification | `alertType`, `alertMessage`, `staffName`, `jobLocation` |
| `custom` | Custom HTML email | `customHtml` |

## Edge Functions Using Resend

| Function | Purpose |
|----------|---------|
| `send-email` | Generic email sending with templates |
| `invite-staff` | Staff invitation emails |
| `send-trial-email` | Trial notification emails |
| `send-invoice-email` | Invoice delivery with PDF attachment |
| `send-payment-reminder` | Overdue payment reminders |

## Troubleshooting

### Common Issues

#### "Sender domain not verified"

- Ensure DNS records are correctly configured
- Wait for DNS propagation (up to 48 hours in some cases)
- Check domain status in Resend Dashboard

#### "API key not found"

- Verify the secret is set in Supabase Edge Functions
- Check the environment variable name is exactly `RESEND_API_KEY`
- Redeploy the edge function after adding secrets

#### Emails going to spam

1. Verify DKIM, SPF, and DMARC records
2. Use a valid from address (not `no-reply@resend.dev` in production)
3. Avoid spam trigger words in subject/content
4. Test with [mail-tester.com](https://mail-tester.com)

### Debug Logging

Check Edge Function logs in Supabase Dashboard:

1. Go to **Edge Functions** → Select function
2. Click **Logs** tab
3. Filter by `[send-email]` or `[invite-staff]`

## Development vs Production

### Development (Free Testing)

Use Resend's test domain for development:
```
RESEND_FROM_EMAIL="Pulcrix <onboarding@resend.dev>"
```

> Note: Test emails only go to the account owner's email

### Production

Use your verified domain:
```
RESEND_FROM_EMAIL="Pulcrix <no-reply@pulcrix.com.au>"
```

## Email Deliverability Best Practices

1. **SPF, DKIM, DMARC**: Always configure all three
2. **Consistent sender**: Use the same from address
3. **Unsubscribe link**: Include for marketing emails
4. **List hygiene**: Remove bounced emails
5. **Gradual warm-up**: Start with low volume on new domains

## Resend Pricing

| Plan | Emails/month | Price |
|------|-------------|-------|
| Free | 3,000 | $0 |
| Pro | 50,000 | $20/mo |
| Enterprise | Unlimited | Custom |

More info: [resend.com/pricing](https://resend.com/pricing)

## Support

- Resend Documentation: [resend.com/docs](https://resend.com/docs)
- Resend Status: [status.resend.com](https://status.resend.com)
- Supabase Edge Functions: [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
