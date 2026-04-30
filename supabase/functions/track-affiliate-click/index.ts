/**
 * Developed by SaaSolutions SL
 * Intellectual Property owned by Paradox FZCO
 * © 2026 Paradox FZCO. All rights reserved.
 *
 * Edge Function: track-affiliate-click
 * Records a click on an affiliate link and redirects to the partner URL.
 * Called as: GET /functions/v1/track-affiliate-click?id=<link_id>
 */
import { getSupabaseAdmin } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  try {
    const url    = new URL(req.url);
    const linkId = url.searchParams.get('id');

    if (!linkId) {
      return new Response('Missing link id', { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Use the RPC to atomically increment and get URL
    const { data: redirectUrl, error } = await supabase
      .rpc('track_affiliate_click', { p_link_id: linkId });

    if (error || !redirectUrl) {
      console.error('[track-affiliate-click]', error);
      return new Response('Link not found', { status: 404 });
    }

    // 302 redirect to the affiliate URL
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        'Cache-Control': 'no-store, no-cache',
      },
    });

  } catch (e: any) {
    console.error('[track-affiliate-click]', e);
    return new Response('Internal error', { status: 500 });
  }
});
