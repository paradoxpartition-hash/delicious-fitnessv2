# Supabase Setup Guide

> Developed by SaaSolutions SL · © 2026 Paradox FZCO

## Quick Start (Local Dev)

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Start local stack
cd delicious-fitness
supabase start

# 4. Run migrations (in order)
supabase db push

# 5. Run seed data
supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/postgres

# 6. Deploy edge functions locally
supabase functions serve --env-file ./supabase/.env.local
```

## Production Deployment

```bash
# Link to your Supabase project
supabase link --project-ref <your-project-ref>

# Push all migrations
supabase db push

# Deploy all edge functions
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
supabase functions deploy translate-recipe
supabase functions deploy generate-meal-plan
supabase functions deploy track-affiliate-click

# Set edge function secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_ID_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_ID_ANNUAL=price_...
supabase secrets set DEEPL_API_KEY=...
supabase secrets set GROQ_API_KEY=gsk_...
```

## Migration Order

| File | Description |
|------|-------------|
| `001_core_schema.sql` | Profiles, recipes, ratings, comments, saves, views |
| `002_chef_community_schema.sql` | Chef profiles, subscriptions, affiliates, meal plans, community, workouts, challenges, blog |
| `003_rpc_functions.sql` | fork_recipe, toggle_save, upsert_rating, like/unlike, view tracking, affiliate clicks |
| `004_rls_policies.sql` | Row Level Security for all tables |
| `005_storage_and_seed.sql` | Storage buckets + challenge/workout/blog seed data |
| `006_jobs_views_realtime.sql` | Cron jobs, DB views, Realtime publications |

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

## Google OAuth Setup

1. Go to Google Cloud Console → APIs & Credentials
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Add to Supabase: Auth → Providers → Google

## Storage Buckets

Created automatically by migration 005. If you need to create manually:

| Bucket | Public | Max size | MIME types |
|--------|--------|----------|------------|
| `recipe-images` | ✅ | 5 MB | image/* |
| `avatars` | ✅ | 2 MB | image/* |
| `blog-covers` | ✅ | 8 MB | image/* |
