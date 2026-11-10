import { NextResponse, type NextRequest } from "next/server";
import { CLE_COOKIE, lireSessionCookie, URL_MINISTERE_PRIVE } from "@/lib/auth";

// ═══════════════════════════════════════════════════════════════════
// EDUGov-Bridge — Proxy d'accès haute performance (Next 16)
//   · / : Page d'accueil publique ultra-rapide (toujours accessible)
//   · /auth : Connexion Terrain (accessible publiquement)
//   · /terrain : Strictement réservé aux sessions type_compte = "terrain"
//   · /ministere : Strictement réservé aux sessions type_compte = "gouvernement"
//   · /cabinet-confidentiel-bf : URL privée secrète du Cabinet
// ═══════════════════════════════════════════════════════════════════

function ajouterEnTetesAntiCache(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookieVal = req.cookies.get(CLE_COOKIE)?.value;
  const session = lireSessionCookie(cookieVal);

  // ── 1. Espace Terrain (/terrain) ──
  if (pathname.startsWith("/terrain")) {
    if (!session || session.type_compte !== "terrain") {
      const url = req.nextUrl.clone();
      url.pathname = "/auth";
      url.search = "";
      return ajouterEnTetesAntiCache(NextResponse.redirect(url));
    }
    return ajouterEnTetesAntiCache(NextResponse.next());
  }

  // ── 2. Espace Ministère (/ministere) ──
  // Doit être totalement inaccessible sans session gouvernementale.
  // Ne divulgue JAMAIS l'existence de l'URL privée : redirection silencieuse vers l'accueil.
  if (pathname.startsWith("/ministere")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return ajouterEnTetesAntiCache(NextResponse.redirect(url));
    }
    if (session.type_compte !== "gouvernement") {
      const url = req.nextUrl.clone();
      url.pathname = "/terrain";
      url.search = "";
      return ajouterEnTetesAntiCache(NextResponse.redirect(url));
    }
    return ajouterEnTetesAntiCache(NextResponse.next());
  }

  // ── 3. URL privée gouvernementale (/cabinet-confidentiel-bf) ──
  if (pathname.startsWith(URL_MINISTERE_PRIVE)) {
    if (session?.type_compte === "gouvernement") {
      const url = req.nextUrl.clone();
      url.pathname = "/ministere";
      url.search = "";
      return ajouterEnTetesAntiCache(NextResponse.redirect(url));
    }
    return ajouterEnTetesAntiCache(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/terrain/:path*",
    "/ministere/:path*",
    "/cabinet-confidentiel-bf",
    "/cabinet-confidentiel-bf/:path*",
  ],
};
