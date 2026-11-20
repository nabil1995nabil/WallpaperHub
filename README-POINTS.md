# WallpaperHub Points Rewards Setup

The application code adds authenticated rewards for likes, comments, and foreground active time.

## Required one-time Supabase setup

1. Open the Supabase project used by WallpaperHub.
2. Open **SQL Editor**.
3. Open this file from GitHub:
   `supabase/migrations/20261120_wallpaperhub_engagement_rewards.sql`
4. Copy the complete SQL into a new SQL Editor query and run it once.
5. Confirm the query completes successfully before testing rewards.

Vercel does not run SQL migrations automatically. The server code remains backward-compatible if this migration has not yet been installed, but the new rewards will not be issued until the RPC functions and tables exist.

## Reward schedule

- New like on another user's wallpaper: **0.90 points**, once per user per wallpaper. A like already rewarded by the legacy points ledger is not paid again.
- New comment: **0.10 points**, up to 10 rewarded comments per UTC day. Comments still work after the reward limit.
- Foreground activity: **0.25 points per 10 minutes**. The site sends a heartbeat about once per minute only while the tab is visible and focused. The server uses its own clock and ignores short duplicate pings and long gaps.
- Normal AdSense display ads: **no points**.

## Rewarded ads

The supplied AdSense display slot is placed in the homepage wallpaper feed as a regular advertisement. It is not connected to rewards.

The reward center displays the planned **0.50 point** Rewarded Ad option as unavailable until a genuine Google Ad Manager Rewarded web ad unit is configured. Do not grant points from normal AdSense ad impressions or clicks.

Reward events are stored in `public.user_points_reward_events`; active-time state is stored in `public.user_active_reward_state`. The authenticated user ID is obtained by the server from the Supabase session, never from the browser request body.
