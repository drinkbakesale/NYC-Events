// Edge Function: analyze-source
// Analyzes a domain to determine if it's an events site and looks for newsletter signup

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeSourceRequest {
  source_id: string;
  domain: string;
  sample_url?: string;
}

interface AnalysisResult {
  is_events_site: boolean;
  candidate_type: "editorial_events_site" | "venue_site" | "other";
  newsletter_signup_url: string | null;
  confidence: number; // 0-1 score
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
    const body: AnalyzeSourceRequest = await req.json();
    const { source_id, domain, sample_url } = body;

    if (!source_id || !domain) {
      return new Response(
        JSON.stringify({ error: "source_id and domain are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing source: ${domain} (${source_id})`);

    // Perform analysis
    const analysis = await analyzeWebsite(domain, sample_url);

    console.log("Analysis result:", analysis);

    // Update the sources table based on analysis
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (analysis.newsletter_signup_url) {
      updates.newsletter_signup_url = analysis.newsletter_signup_url;
      updates.status = "suggested"; // Mark as suggested if newsletter found
    }

    if (analysis.is_events_site) {
      updates.candidate_type = analysis.candidate_type;
    }

    // If no newsletter found but it's an events site, keep as unseen
    if (!analysis.newsletter_signup_url && analysis.is_events_site) {
      updates.status = "unseen";
    }

    const { data: updatedSource, error: updateError } = await supabase
      .from("sources")
      .update(updates)
      .eq("id", source_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating source:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update source", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Source updated:", updatedSource);

    return new Response(
      JSON.stringify({
        status: "ok",
        source_id,
        domain,
        analysis,
        updated_fields: updates,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in analyze-source function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Analyzes a website to determine if it's an events site and looks for newsletter signup
 *
 * TODO: This is a simple heuristic-based approach. Consider upgrading to:
 * - Use a proper HTML parser like linkedom or jsdom
 * - Use AI/LLM to analyze page content
 * - Use structured data extraction (schema.org, microformats)
 */
async function analyzeWebsite(
  domain: string,
  sampleUrl?: string
): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    is_events_site: false,
    candidate_type: "other",
    newsletter_signup_url: null,
    confidence: 0,
  };

  try {
    // Step 1: Analyze the sample URL (if provided) or construct a likely events page URL
    const urlsToCheck: string[] = [];

    if (sampleUrl) {
      urlsToCheck.push(sampleUrl);
    }

    // Add common events page paths
    urlsToCheck.push(
      `https://${domain}`,
      `https://${domain}/events`,
      `https://${domain}/calendar`,
      `https://${domain}/whatson`,
      `https://${domain}/upcoming`
    );

    let eventsPageHtml = "";
    let eventsPageUrl = "";

    // Try to fetch the first available URL
    for (const url of urlsToCheck) {
      try {
        console.log(`Fetching: ${url}`);
        const response = await fetch(url, {
          headers: {
            "User-Agent": "NYC-Events-Finder/1.0",
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (response.ok) {
          eventsPageHtml = await response.text();
          eventsPageUrl = url;
          console.log(`Successfully fetched: ${url} (${eventsPageHtml.length} bytes)`);
          break;
        }
      } catch (err) {
        console.log(`Failed to fetch ${url}:`, err.message);
        continue;
      }
    }

    if (!eventsPageHtml) {
      console.log("Could not fetch any page for analysis");
      return result;
    }

    // Step 2: Check if this looks like an events site
    const isEventsPage = checkIfEventsPage(eventsPageHtml, eventsPageUrl);

    if (isEventsPage.isEvents) {
      result.is_events_site = true;
      result.candidate_type = isEventsPage.type;
      result.confidence = isEventsPage.confidence;
    }

    // Step 3: Look for newsletter signup on the homepage
    let homepageHtml = eventsPageHtml;

    // If we didn't already fetch the homepage, fetch it now
    if (!eventsPageUrl.match(new RegExp(`^https://${domain}/?$`))) {
      try {
        const homepageResponse = await fetch(`https://${domain}`, {
          headers: {
            "User-Agent": "NYC-Events-Finder/1.0",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (homepageResponse.ok) {
          homepageHtml = await homepageResponse.text();
          console.log(`Fetched homepage: ${homepageHtml.length} bytes`);
        }
      } catch (err) {
        console.log("Failed to fetch homepage:", err.message);
      }
    }

    // Look for newsletter signup
    const newsletterUrl = findNewsletterSignup(homepageHtml, domain);

    if (newsletterUrl) {
      result.newsletter_signup_url = newsletterUrl;
      console.log(`Found newsletter signup: ${newsletterUrl}`);
    }

    return result;
  } catch (error) {
    console.error("Error analyzing website:", error);
    return result;
  }
}

/**
 * Checks if HTML content looks like an events page
 */
function checkIfEventsPage(
  html: string,
  url: string
): { isEvents: boolean; type: "editorial_events_site" | "venue_site" | "other"; confidence: number } {
  const htmlLower = html.toLowerCase();
  const urlLower = url.toLowerCase();

  let eventsScore = 0;
  let venueScore = 0;

  // URL path indicators
  if (urlLower.includes("/events") || urlLower.includes("/calendar") || urlLower.includes("/whatson")) {
    eventsScore += 0.3;
  }

  // Date/time pattern indicators (look for multiple occurrences)
  const datePatterns = [
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}/g,
    /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
    /\b\d{1,2}:\d{2}\s*(?:am|pm)/gi,
  ];

  let totalDateMatches = 0;
  for (const pattern of datePatterns) {
    const matches = html.match(pattern);
    if (matches) {
      totalDateMatches += matches.length;
    }
  }

  // If we find 5+ date/time patterns, likely an events page
  if (totalDateMatches >= 5) {
    eventsScore += 0.4;
  } else if (totalDateMatches >= 2) {
    eventsScore += 0.2;
  }

  // Event-specific keywords
  const eventKeywords = [
    "upcoming events",
    "event calendar",
    "what's on",
    "this week",
    "tonight",
    "rsvp",
    "tickets",
    "admission",
  ];

  for (const keyword of eventKeywords) {
    if (htmlLower.includes(keyword)) {
      eventsScore += 0.05;
    }
  }

  // Venue indicators
  const venueKeywords = ["our venue", "book now", "private events", "capacity:", "floor plan"];

  for (const keyword of venueKeywords) {
    if (htmlLower.includes(keyword)) {
      venueScore += 0.1;
    }
  }

  // Determine type and confidence
  const isEvents = eventsScore >= 0.3;
  const type = venueScore > eventsScore ? "venue_site" : eventsScore > 0.5 ? "editorial_events_site" : "other";
  const confidence = Math.min(1, Math.max(eventsScore, venueScore));

  return { isEvents, type, confidence };
}

/**
 * Looks for newsletter signup URL in HTML
 *
 * TODO: Consider upgrading to a proper HTML parser for more robust detection
 */
function findNewsletterSignup(html: string, domain: string): string | null {
  const htmlLower = html.toLowerCase();

  // Pattern 1: Look for Substack (very common for newsletters)
  const substackMatch = html.match(/https?:\/\/([a-z0-9-]+\.substack\.com)/i);
  if (substackMatch) {
    return substackMatch[0];
  }

  // Pattern 2: Look for Mailchimp signup URLs
  const mailchimpMatch = html.match(/https?:\/\/[a-z0-9-]+\.(?:list-manage|us\d+\.list-manage)\.com\/subscribe[^"'\s]*/i);
  if (mailchimpMatch) {
    return mailchimpMatch[0];
  }

  // Pattern 3: Look for links with newsletter-related text
  const newsletterLinkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*(?:newsletter|subscribe|sign up|get updates|email list)[^<]*)<\/a>/gi;
  const linkMatches = html.matchAll(newsletterLinkPattern);

  for (const match of linkMatches) {
    let url = match[1];

    // Make relative URLs absolute
    if (url.startsWith("/")) {
      url = `https://${domain}${url}`;
    } else if (!url.startsWith("http")) {
      url = `https://${domain}/${url}`;
    }

    // Skip social media and email links
    if (url.includes("twitter.com") || url.includes("facebook.com") || url.startsWith("mailto:")) {
      continue;
    }

    return url;
  }

  // Pattern 4: Look for forms with email inputs and newsletter-related context
  const formPattern = /<form[^>]*>[\s\S]*?<input[^>]*(?:type=["']email["']|name=["']email["'])[^>]*>[\s\S]*?<\/form>/gi;
  const formMatches = html.matchAll(formPattern);

  for (const match of formMatches) {
    const formHtml = match[0].toLowerCase();

    // Check if form context mentions newsletter
    if (
      formHtml.includes("newsletter") ||
      formHtml.includes("subscribe") ||
      formHtml.includes("sign up") ||
      formHtml.includes("get updates")
    ) {
      // Try to extract action URL
      const actionMatch = match[0].match(/action=["']([^"']+)["']/i);
      if (actionMatch) {
        let actionUrl = actionMatch[1];

        if (actionUrl.startsWith("/")) {
          actionUrl = `https://${domain}${actionUrl}`;
        } else if (!actionUrl.startsWith("http")) {
          actionUrl = `https://${domain}/${actionUrl}`;
        }

        return actionUrl;
      } else {
        // No action URL, return the page itself as signup page
        return `https://${domain}`;
      }
    }
  }

  // Pattern 5: Look for common newsletter page paths
  const commonNewsletterPaths = ["/newsletter", "/subscribe", "/signup", "/join"];

  for (const path of commonNewsletterPaths) {
    if (htmlLower.includes(`href="${path}"`) || htmlLower.includes(`href='${path}'`)) {
      return `https://${domain}${path}`;
    }
  }

  return null;
}
