"use client";

// Composant client dédié à la navigation authentifiée.
// Espace public par défaut : seule l'option « Connexion » est visible.
// Une fois identifié : accès direct à l'espace de travail + déconnexion
// purgée côté serveur (cookie httpOnly) via la server action deconnexion().

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, GraduationCap, LogIn, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { chargerSession, effacerSession, espaceDe, type SessionUtilisateur } from "@/lib/auth";
import { deconnexion } from "@/app/auth/actions";

export default function NavSession() {
  const router = useRouter();
  const [session, setSession] = useState<SessionUtilisateur | null>(null);
  const [pret, setPret] = useState(false);
  const [sortie, setSortie] = useState(false);

  useEffect(() => {
    setSession(chargerSession());
    setPret(true);
  }, []);

  const seDetacher = (e: React.MouseEvent) => {
    e.preventDefault();
    if (sortie) return;
    setSortie(true);
    void (async () => {
      await deconnexion();
      effacerSession();
      setSession(null);
      setSortie(false);
      router.push("/auth");
      router.refresh();
    })();
  };

  // Avant hydratation : affichage public neutre (aucun flash d'espace interne)
  if (!pret || !session) {
    return (
      <Link
        href="/auth"
        className="flex items-center gap-2 rounded-lg bg-institution px-3 py-2 text-sm font-medium text-white hover:bg-institution-dark"
      >
        <LogIn size={15} /> Connexion
      </Link>
    );
  }

  const acteurTerrain = session.type_compte === "terrain";
  const destination = espaceDe(session);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={destination}
        className="flex items-center gap-2 rounded-lg bg-institution px-3 py-2 text-sm font-medium text-white hover:bg-institution-dark"
      >
        {acteurTerrain ? <GraduationCap size={15} /> : <Building2 size={15} />}
        Mon espace
      </Link>
      <Button
        size="sm"
        variant="outline"
        onClick={seDetacher}
        disabled={sortie}
        aria-label="Se déconnecter"
        className="h-10"
      >
        {sortie ? <Loader2 className="animate-spin" size={14} /> : <LogOut size={14} />}
        <span className="hidden sm:inline">Quitter</span>
      </Button>
    </div>
  );
}
