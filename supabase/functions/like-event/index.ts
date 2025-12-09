// Edge Function: like-event
// Handles user liking an event and triggers Make.com webhook for source discovery

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LikeEventRequest {
  user_id: string;
  event_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const makeWebhookUrl = Deno.env.get("MAKE_WEBHOOK_URL_LIKE_EVENT");

    if (!makeWebhookUrl) {
      console.error("MAKE_WEBHOOK_URL_LIKE_EVENT environment variable not set");
      return new Response(
        JSON.stringify({ error: "Make.com webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: LikeEventRequest = await req.json();
    const { user_id, event_id } = body;

    if (!user_id || !event_id) {
      return new Response(
        JSON.stringify({ error: "user_id and event_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing like for event ${event_id} by user ${user_id}`);

    // Step 1: Insert or update the reaction
    const { data: reactionData, error: reactionError } = await supabase
      .from("user_event_reactions")
      .upsert(
        {
          user_id,
          event_id,
          reaction: "like",
        },
        {
          onConflict: "user_id,event_id",
        }
      )
      .select();

    if (reactionError) {
      console.error("Error upserting reaction:", reactionError);
      return new Response(
        JSON.stringify({ error: "Failed to save reaction", details: reactionError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Reaction saved:", reactionData);

    // Step 2: Fetch event details
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, title, venue_name, start_time, neighborhood")
      .eq("id", event_id)
      .single();

    if (eventError || !eventData) {
      console.error("Error fetching event:", eventError);
      return new Response(
        JSON.stringify({ error: "Event not found", details: eventError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Event details:", eventData);

    // Step 3: Build search queries
    const searchQueries: string[] = [];

    // Query 1: Title + Venue + NYC
    if (eventData.title && eventData.venue_name) {
      searchQueries.push(`"${eventData.title}" ${eventData.venue_name} NYC`);
    }

    // Query 2: Title + NYC
    if (eventData.title) {
      searchQueries.push(`"${eventData.title}" NYC`);
    }

    // Query 3: Title + Neighborhood (if available)
    if (eventData.title && eventData.neighborhood) {
      searchQueries.push(`"${eventData.title}" ${eventData.neighborhood} NYC`);
    }

    // Query 4: Venue-only search (to discover venue sites)
    if (eventData.venue_name) {
      searchQueries.push(`${eventData.venue_name} events NYC`);
    }

    console.log("Generated search queries:", searchQueries);

    // Step 4: Call Make.com webhook
    const makePayload = {
      event_id: eventData.id,
      title: eventData.title,
      venue_name: eventData.venue_name,
      start_time: eventData.start_time,
      neighborhood: eventData.neighborhood,
      search_queries: searchQueries,
    };

    console.log("Calling Make.com webhook with payload:", makePayload);

    const makeResponse = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(makePayload),
    });

    if (!makeResponse.ok) {
      const errorText = await makeResponse.text();
      console.error("Make.com webhook call failed:", errorText);
      // Don't fail the entire request - the reaction was saved successfully
      return new Response(
        JSON.stringify({
          status: "partial_success",
          message: "Reaction saved but Make.com webhook failed",
          webhook_error: errorText,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const makeResponseData = await makeResponse.text();
    console.log("Make.com webhook response:", makeResponseData);

    // Success response
    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Event liked and source discovery triggered",
        event_id: eventData.id,
        search_queries_count: searchQueries.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in like-event function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
