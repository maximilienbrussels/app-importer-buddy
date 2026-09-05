import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/auth/google
 *
 * Start de Google-aanmelding: we bewaren een willekeurige `state` in een
 * HttpOnly-cookie en sturen de bezoeker door naar het toestemmingsscherm van
 * Google. De client secret blijft altijd op de server.
 */
export const Route = createFileRoute("/api/auth/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const {
          googleCredentials,
          redirectUri,
          siteOrigin,
          cookieHeader,
          OAUTH_STATE_COOKIE,
          GOOGLE_AUTH_ENDPOINT,
        } = await import("@/lib/google-oauth.server");

        const { logAuthConfig, loginErrorUrl } = await import("@/lib/auth-config");
        const creds = googleCredentials();
        const origin = siteOrigin(request);
        logAuthConfig(origin, "google");
        if (!creds) {
          console.error("[OAuth Failure]", {
            provider: "google",
            reason: "google-niet-geconfigureerd",
            origin,
          });
          return Response.redirect(
            loginErrorUrl(origin, request, "google-niet-geconfigureerd", "google"),
            302,
          );
        }

        const requested = new URL(request.url).searchParams.get("next");
        const next = requested && requested.startsWith("/") ? requested : "";
        const nonce = crypto.randomUUID().replace(/-/g, "");
        const state = next ? `${nonce}.${btoa(next)}` : nonce;

        const authUrl = new URL(GOOGLE_AUTH_ENDPOINT);
        authUrl.searchParams.set("client_id", creds.clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri(request));
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "openid email profile");
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("prompt", "select_account");
        authUrl.searchParams.set("access_type", "online");

        return new Response(null, {
          status: 302,
          headers: {
            Location: authUrl.toString(),
            "Set-Cookie": cookieHeader(OAUTH_STATE_COOKIE, state, {
              maxAge: 600,
              secure: origin.startsWith("https://"),
            }),
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
