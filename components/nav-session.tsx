"use client";

// Composant client dédié à la navigation authentifiée.
// Espace public par défaut : seule l'option « Connexion » est visible.
// Une fois identifié : accès direct à l'espace de travail + déconnexion
// purgée côté serveur (cookie httpOnly) via la server action deconnexion().

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Building2, GraduationCap, LogIn, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { chargerSession, effacerSession, espaceDe, type SessionUtilisateur } from "@/lib/auth";
import { deconnexion } from "@/app/auth/actions";

export default function NavSession() {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionUtilisateur | null>(null);
  const [pret, setPret] = useState(false);
  const [sortie, setSortie] = useState(false);

  // Relit le localStorage à chaque changement de page (navigation client-side)
  // et synchronise aussi si un autre onglet modifie la session.
  useEffect(() => {
    const sync = () => {
      setSession(chargerSession());
      setPret(true);
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [pathname]); // pathname = dépendance pour re-sync à chaque navigation

  const seDetacher = (e: React.MouseEvent) => {
    e.preventDefault();
    if (sortie) return;
    setSortie(true);
    void (async () => {
      const etaitGov = session?.type_compte === "gouvernement";
      await deconnexion();
      effacerSession();
      setSession(null);
      setSortie(false);
      router.replace(etaitGov ? "/" : "/auth");
      router.refresh();
    })();
  };

  // Avant hydratation : affichage public neutre (aucun flash d'espace interne)
  if (!pret) {
    return (
      <Link
        href="/auth"
        className="flex items-center gap-1.5 rounded-lg bg-institution px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white opacity-0 pointer-events-none"
        aria-hidden
      >
        <LogIn size={14} className="sm:size-[15px]" /> Connexion
      </Link>
    );
  }

  if (!session) {
    return (
      <Link
        href="/auth"
        className="flex items-center gap-1.5 rounded-lg bg-institution px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-institution-dark shadow-sm transition"
      >
        <LogIn size={14} className="sm:size-[15px]" /> <span>Connexion</span>
      </Link>
    );
  }

  const acteurTerrain = session.type_compte === "terrain";
  const destination = espaceDe(session);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Link
        href={destination}
        className="flex items-center gap-1.5 rounded-lg bg-institution px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-institution-dark shadow-sm transition"
      >
        {acteurTerrain ? <GraduationCap size={14} className="sm:size-[15px]" /> : <Building2 size={14} className="sm:size-[15px]" />}
        espace
      </Link>
      <Button
        size="sm"
        variant="outline"
        onClick={seDetacher}
        disabled={sortie}
        aria-label="Se déconnecter"
        className="h-8 sm:h-9 px-2 sm:px-2.5 text-xs"
      >
        {sortie ? <Loader2 className="animate-spin" size={13} /> : <LogOut size={13} />}
        <span className="hidden sm:inline">Quitter</span>
      </Button>
    </div>
  );
}
