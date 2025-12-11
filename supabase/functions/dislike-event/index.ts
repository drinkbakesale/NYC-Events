// Edge Function: dislike-event
// Handles disliking an event (marks event as hidden globally)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DislikeEventRequest {
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

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: DislikeEventRequest = await req.json();
    const { user_id, event_id } = body;

    if (!user_id || !event_id) {
      return new Response(
        JSON.stringify({ error: "user_id and event_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user_id} disliking event ${event_id}`);

    // Step 1: Check if event exists
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, source_id")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Upsert the dislike reaction (replace any existing reaction)
    const { data: reaction, error: reactionError } = await supabase
      .from("user_event_reactions")
      .upsert(
        {
          user_id,
          event_id,
          reaction: "dislike",
        },
        {
          onConflict: "user_id,event_id",
        }
      )
      .select()
      .single();

    if (reactionError) {
      console.error("Error upserting dislike reaction:", reactionError);
      return new Response(
        JSON.stringify({ error: "Failed to record dislike", details: reactionError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Dislike recorded: ${reaction.id}`);

    // Step 3: Mark event as hidden globally
    const { error: hideError } = await supabase
      .from("events")
      .update({ hidden: true })
      .eq("id", event_id);

    if (hideError) {
      console.error("Error hiding event:", hideError);
      // Don't fail the request, just log it
    }

    // Step 4: If event has a source, check dislike count for that source
    let sourceDislikeCount = 0;
    let shouldUnsubscribe = false;

    if (event.source_id) {
      const { data: countData, error: countError } = await supabase
        .rpc("get_source_dislike_count", { p_source_id: event.source_id });

      if (!countError && countData !== null) {
        sourceDislikeCount = countData;
        shouldUnsubscribe = sourceDislikeCount >= 5;

        console.log(`Source ${event.source_id} has ${sourceDislikeCount} dislikes`);

        // Note: We don't automatically change source status here
        // The sources_to_unsubscribe view will show these sources
        // User can manually unsubscribe from the UI
      }
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Event disliked successfully",
        reaction_id: reaction.id,
        event_hidden: true,
        source_dislike_count: sourceDislikeCount,
        should_unsubscribe: shouldUnsubscribe,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in dislike-event function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
