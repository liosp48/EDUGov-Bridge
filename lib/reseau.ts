// ─────────────────────────────────────────────────────────────────
// EDUGov-Bridge — Disjoncteur réseau partagé (Supabase)
//
// Si le backend est lent ou injoignable, on cesse de l'interroger
// pendant une fenêtre de récupération et on sert immédiatement les
// données de démonstration. Cela évite de payer un timeout complet
// (1,2 s+) à chaque chargement de page sur un réseau dégradé —
// situation fréquente sur les connexions nationales.
// ─────────────────────────────────────────────────────────────────

/** Durée pendant laquelle on ne réessaie pas après un échec réseau */
const FENETRE_REPRISE_MS = 30_000;

let indisponibleJusqua = 0;

/** true = backend supposé injoignable → servir le fallback sans attendre */
export function backendIndisponible(): boolean {
  return Date.now() < indisponibleJusqua;
}

/** Enregistre un échec réseau et ouvre la fenêtre de récupération */
export function marquerBackendIndisponible(): void {
  indisponibleJusqua = Date.now() + FENETRE_REPRISE_MS;
}

/** Un succès rétablit immédiatement la confiance */
export function marquerBackendOperationnel(): void {
  indisponibleJusqua = 0;
}
