// Edge Function: ingest-email
// Ingests emails from the newsletter inbox (called by Make.com)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IngestEmailRequest {
  raw_email_id: string;
  from_address: string;
  subject: string;
  received_at: string; // ISO8601 timestamp
  html_body?: string;
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
    const body: IngestEmailRequest = await req.json();
    const { raw_email_id, from_address, subject, received_at, html_body } = body;

    if (!raw_email_id || !from_address) {
      return new Response(
        JSON.stringify({ error: "raw_email_id and from_address are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Ingesting email: ${raw_email_id} from ${from_address}`);

    // Step 1: Check if email already exists (idempotency)
    const { data: existingEmail, error: checkError } = await supabase
      .from("ingested_emails")
      .select("id, raw_email_id")
      .eq("raw_email_id", raw_email_id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for existing email:", checkError);
      return new Response(
        JSON.stringify({ error: "Database error", details: checkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingEmail) {
      console.log(`Email ${raw_email_id} already exists, skipping (idempotent)`);
      return new Response(
        JSON.stringify({
          status: "already_exists",
          message: "Email already ingested",
          ingested_email_id: existingEmail.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Extract domain from from_address
    const domain = extractDomain(from_address);
    console.log(`Extracted domain: ${domain}`);

    // Step 3: Find matching source by domain
    let sourceId: string | null = null;

    if (domain) {
      // Try exact match first
      let { data: source, error: sourceError } = await supabase
        .from("sources")
        .select("id, domain, status")
        .eq("domain", domain)
        .maybeSingle();

      // If no exact match, try to find by subdomain (e.g., newsletter.example.com -> example.com)
      if (!source && domain.split(".").length > 2) {
        const baseDomain = domain.split(".").slice(-2).join(".");
        console.log(`Trying base domain: ${baseDomain}`);

        const { data: baseSource } = await supabase
          .from("sources")
          .select("id, domain, status")
          .eq("domain", baseDomain)
          .maybeSingle();

        source = baseSource;
      }

      if (source) {
        sourceId = source.id;
        console.log(`Matched to source: ${source.domain} (${sourceId})`);

        // Update last_email_seen_at for the newsletter subscription
        const { error: updateSubError } = await supabase
          .from("newsletter_subscriptions")
          .update({ last_email_seen_at: received_at })
          .eq("source_id", sourceId);

        if (updateSubError) {
          console.warn("Could not update newsletter_subscriptions:", updateSubError.message);
        }
      } else {
        console.log(`No matching source found for domain: ${domain}`);
        // Optionally: Create a new source automatically
        // For now, we'll just leave source_id as null
      }
    }

    // Step 4: Insert into ingested_emails
    const { data: ingestedEmail, error: insertError } = await supabase
      .from("ingested_emails")
      .insert({
        raw_email_id,
        source_id: sourceId,
        from_address,
        subject,
        received_at,
        html_body: html_body || null,
        parsed_status: "pending",
        parsed_events_count: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting email:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to insert email", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Email ingested successfully: ${ingestedEmail.id}`);

    // Step 5: TODO - Parse email for events
    // This is where you would call a helper function to extract events from html_body
    // For now, we'll just mark it as pending
    /*
    if (html_body && sourceId) {
      const parsedEvents = await parseEmailForEvents(html_body, sourceId, ingestedEmail.id);

      // Update ingested_emails with parsed status
      await supabase
        .from("ingested_emails")
        .update({
          parsed_status: parsedEvents.length > 0 ? "parsed" : "failed",
          parsed_events_count: parsedEvents.length,
        })
        .eq("id", ingestedEmail.id);
    }
    */

    return new Response(
      JSON.stringify({
        status: "ok",
        message: "Email ingested successfully",
        ingested_email_id: ingestedEmail.id,
        source_id: sourceId,
        domain,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in ingest-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Extracts domain from an email address
 * Examples:
 *   hello@example.com -> example.com
 *   newsletter@mail.substack.com -> substack.com (special case)
 */
function extractDomain(email: string): string | null {
  try {
    const match = email.match(/@([a-z0-9.-]+\.[a-z]{2,})$/i);
    if (!match) return null;

    let domain = match[1].toLowerCase();

    // Special handling for known newsletter platforms
    // Substack: newsletter@example.substack.com -> example.substack.com
    if (domain.includes(".substack.com")) {
      const substackMatch = email.match(/@([a-z0-9-]+\.substack\.com)/i);
      if (substackMatch) {
        return substackMatch[1].toLowerCase();
      }
    }

    // Beehiiv: newsletter@mail.beehiiv.com uses custom sending domains
    // For now, just return the full domain

    return domain;
  } catch (err) {
    console.error("Error extracting domain:", err);
    return null;
  }
}

/**
 * TODO: Parse HTML body to extract events
 *
 * This is a placeholder for future implementation. Ideas:
 *
 * 1. Use regex patterns to find date/time/venue information
 * 2. Use an HTML parser to extract structured data
 * 3. Use AI/LLM (e.g., Claude API) to extract events from HTML
 * 4. Look for schema.org Event markup
 * 5. Train a custom model for event extraction
 *
 * Example return type:
 *
 * interface ParsedEvent {
 *   title: string;
 *   description?: string;
 *   start_time?: string;
 *   end_time?: string;
 *   venue_name?: string;
 *   source_event_url?: string;
 * }
 *
 * async function parseEmailForEvents(
 *   htmlBody: string,
 *   sourceId: string,
 *   ingestedEmailId: string
 * ): Promise<ParsedEvent[]> {
 *   // Implementation here
 *   return [];
 * }
 */
