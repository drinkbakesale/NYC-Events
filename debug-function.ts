// Simple debug version of like-event
// This will help us see what's failing

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Log environment variables (for debugging)
    const hasUrl = Deno.env.get("SUPABASE_URL") ? "YES" : "NO";
    const hasKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "YES" : "NO";
    const hasWebhook = Deno.env.get("MAKE_WEBHOOK_URL_LIKE_EVENT") ? "YES" : "NO";

    console.log("Environment check:", { hasUrl, hasKey, hasWebhook });

    const body = await req.json();

    return new Response(
      JSON.stringify({
        status: "debug",
        received: body,
        env_check: {
          SUPABASE_URL: hasUrl,
          SUPABASE_SERVICE_ROLE_KEY: hasKey,
          MAKE_WEBHOOK_URL_LIKE_EVENT: hasWebhook
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
