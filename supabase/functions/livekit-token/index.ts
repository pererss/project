// ============================================================
// SENTCOR — Supabase Edge Function: LiveKit Token Generator
// Deploy with: supabase functions deploy livekit-token
// ============================================================

import { AccessToken } from "npm:livekit-server-sdk@2";

// These values are automatically loaded from your Supabase project's secrets.
// Set them in the Supabase Dashboard > Edge Functions > Secrets:
//   LIVEKIT_API_KEY=...
//   LIVEKIT_API_SECRET=...

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const body = await req.json();
    const { roomName, participantName, userId } = body;

    if (!roomName || !participantName) {
      return new Response(
        JSON.stringify({ error: "roomName and participantName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");

    if (!apiKey || !apiSecret) {
      console.error("LiveKit API credentials not configured. Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET secrets.");
      return new Response(
        JSON.stringify({ error: "Server configuration error: LiveKit credentials are missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate LiveKit access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: userId ? JSON.stringify({ userId }) : undefined,
      ttl: 3600, // 1 hour
    });

    // Grant permission to join the room
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return new Response(
      JSON.stringify({ token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating token:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});