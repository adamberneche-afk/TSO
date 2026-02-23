# Weekly Insights - Two Options

## Option 1: GitHub Actions (Free - Recommended)

1. Add secrets to GitHub:
   - Go to: https://github.com/adamberneche-afk/TSO/settings/secrets/actions
   - Add `CRON_SECRET` = your cron secret value

2. The workflow is already configured:
   - `.github/workflows/weekly-insights.yml`
   - Runs every Monday at 9am UTC
   - Can also be triggered manually from GitHub Actions tab

## Option 2: Render Cron (Paid)

Render requires payment for cron jobs. Use GitHub Actions instead.

## Manual Trigger

To trigger insights email manually:
```bash
curl -X POST https://tso.onrender.com/admin/cron/weekly-insights \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Environment Variables Required

Make sure these are set in your Render environment:
- `SENDGRID_API_KEY` - For sending emails (optional - logs to console if not set)
- `CRON_SECRET` - Secret for cron authentication
