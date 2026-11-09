import { NextResponse, type NextRequest } from "next/server";
import { CLE_COOKIE, espaceDe, lireSessionCookie } from "@/lib/auth";

// ═══════════════════════════════════════════════════════════════════
// EDUGov-Bridge — Proxy d'accès (ex-middleware, convention Next 16)
//   · /terrain    → réservé aux sessions type_compte = "terrain"
//   · /ministere  → réservé aux sessions type_compte = "gouvernement"
//   · /auth       → un utilisateur déjà connecté est orienté vers
//                   son espace de travail, jamais la page publique.
// La session provient du cookie httpOnly posé par les server actions.
// ═══════════════════════════════════════════════════════════════════

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = lireSessionCookie(req.cookies.get(CLE_COOKIE)?.value);
  const destination = espaceDe(session);

  // ── Espace Terrain : strictement réservé aux acteurs du terrain ──
  if (pathname.startsWith("/terrain")) {
    if (!session || session.type_compte !== "terrain") {
      const url = req.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("prochaine", "/terrain");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Espace Ministère : strictement réservé aux décideurs autorisés ──
  if (pathname.startsWith("/ministere")) {
    if (!session || session.type_compte !== "gouvernement") {
      const url = req.nextUrl.clone();
      url.pathname = "/auth";
      url.searchParams.set("prochaine", "/ministere");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── /auth : un utilisateur déjà identifié va directement dans son espace ──
  if (pathname.startsWith("/auth") && destination !== "/auth") {
    const url = req.nextUrl.clone();
    url.pathname = destination;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/terrain/:path*", "/ministere/:path*", "/auth"],
};