import type * as Party from "partykit/server";

// 1 minute cooldown between calls per IP - persisted in storage
const COOLDOWN_MS = 1 * 60 * 1000; // 1 minute

export default class BlandServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onRequest(req: Party.Request): Promise<Response> {
    // Enable CORS
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (req.method === "POST") {
      try {
        const body = await req.json() as { agentName: string };
        const { agentName } = body;

        // Get client IP for rate limiting
        const clientIP = req.headers.get("cf-connecting-ip") ||
                         req.headers.get("x-forwarded-for")?.split(",")[0] ||
                         req.headers.get("x-real-ip") ||
                         "unknown";

        // Check cooldown from persistent storage (survives refreshes/restarts)
        const storageKey = `call_cooldown_${clientIP}`;
        const lastCall = await this.room.storage.get<number>(storageKey);
        const now = Date.now();
        if (lastCall && (now - lastCall) < COOLDOWN_MS) {
          const remainingMs = COOLDOWN_MS - (now - lastCall);
          const remainingSecs = Math.ceil(remainingMs / 1000);
          return new Response(
            JSON.stringify({
              error: "cooldown",
              message: `Please wait ${remainingSecs} seconds before calling again.`,
              remainingMs
            }),
            { status: 429, headers }
          );
        }

        // Look up the Bland agent ID (must use this.room.env in PartyKit workers)
        const agentIds: Record<string, string> = {
          'KingMolt': this.room.env.BLAND_AGENT_KINGMOLT as string || '',
          'Shellraiser': this.room.env.BLAND_AGENT_SHELLRAISER as string || ''
        };
        const agentId = agentIds[agentName];
        if (!agentId) {
          return new Response(
            JSON.stringify({ error: "Agent not available for calls" }),
            { status: 400, headers }
          );
        }

        const apiKey = this.room.env.BLAND_API_KEY as string;

        // Debug logging
        console.log(`Bland call request: agent=${agentName}, agentId=${agentId}, apiKeyExists=${!!apiKey}`);

        if (!apiKey) {
          console.error("BLAND_API_KEY not configured");
          return new Response(
            JSON.stringify({ error: "Service not configured" }),
            { status: 500, headers }
          );
        }

        // Create session with Bland API (lowercase "authorization" per Bland docs)
        console.log(`Calling Bland API: https://api.bland.ai/v1/agents/${agentId}/authorize`);
        const response = await fetch(`https://api.bland.ai/v1/agents/${agentId}/authorize`, {
          method: "POST",
          headers: {
            "authorization": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Bland API error:", response.status, errorText);
          return new Response(
            JSON.stringify({ error: "Failed to create session" }),
            { status: 500, headers }
          );
        }

        const session = await response.json();
        console.log(`Bland session created for ${agentName} from IP ${clientIP}`);

        // Record this IP's call time for cooldown (persistent storage)
        await this.room.storage.put(storageKey, Date.now());

        return new Response(JSON.stringify({
          token: session.token,
          agentId: agentId
        }), { headers });

      } catch (error) {
        console.error("Error creating Bland session:", error);
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          { status: 500, headers }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }
}
