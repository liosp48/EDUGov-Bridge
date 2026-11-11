"use client";

// ─────────────────────────────────────────────────────────────────
// Création d'un nouvel ordre de mission (Cabinet-Confidentiel-BF)
// Réservé aux administrateurs authentifiés.
// ─────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import GeoSelector from "@/components/geo-selector";
import { creerMission, publierMission } from "@/lib/missions";
import { TERRAIN_ROLES, ROLE_LABELS, type UserRole } from "@/types/database";

export default function NouvelleMissionPage() {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  // Champs du formulaire
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [objectifs, setObjectifs] = useState("");
  const [consignes, setConsignes] = useState("");
  const [echeance, setEcheance] = useState("");
  const [rolesCibles, setRolesCibles] = useState<UserRole[]>([...TERRAIN_ROLES]);

  // Géographie
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [commune, setCommune] = useState("");
  const [portee, setPortee] = useState<"nationale" | "regionale" | "provinciale" | "communale">(
    "nationale"
  );

  const toggleRole = (r: UserRole) =>
    setRolesCibles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );

  const getGeo = () => {
    if (portee === "nationale") return { region_cible: null, province_cible: null, commune_cible: null };
    if (portee === "regionale") return { region_cible: region || null, province_cible: null, commune_cible: null };
    if (portee === "provinciale") return { region_cible: region || null, province_cible: province || null, commune_cible: null };
    return { region_cible: region || null, province_cible: province || null, commune_cible: commune || null };
  };

  const soumettre = async (action: "brouillon" | "publier") => {
    setErreur(null);
    if (!titre.trim()) return setErreur("Le titre de la mission est obligatoire.");
    if (description.trim().length < 20) return setErreur("La description doit faire au moins 20 caractères.");
    if (objectifs.trim().length < 10) return setErreur("Les objectifs doivent faire au moins 10 caractères.");
    if (rolesCibles.length === 0) return setErreur("Sélectionnez au moins un type d'acteur destinataire.");
    if (portee !== "nationale" && !region) return setErreur("Veuillez sélectionner une région.");
    if (portee === "provinciale" && !province) return setErreur("Veuillez sélectionner une province.");
    if (portee === "communale" && !commune) return setErreur("Veuillez sélectionner une commune.");

    setEnvoi(true);
    const geo = getGeo();

    const resultat = await creerMission({
      titre: titre.trim(),
      description: description.trim(),
      objectifs: objectifs.trim(),
      consignes: consignes.trim(),
      echeance: echeance || null,
      roles_cibles: rolesCibles,
      created_by: "admin@education.gov.bf",
      ...geo,
    });

    if (!resultat.ok) {
      setEnvoi(false);
      return setErreur(resultat.error);
    }

    if (action === "publier") {
      await publierMission(resultat.id);
      setSucces("✅ Ordre de mission publié et transmis aux acteurs de terrain !");
    } else {
      setSucces("✅ Mission enregistrée en brouillon. Vous pourrez la publier depuis la liste des missions.");
    }
    setEnvoi(false);

    setTimeout(() => {
      router.push("/cabinet-confidentiel-bf");
    }, 2000);
  };

  if (succes) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <CheckCircle2 size={48} className="mx-auto text-faso-green" />
        <p className="mt-4 text-lg font-semibold text-slate-800">{succes}</p>
        <p className="mt-1 text-sm text-slate-500">Redirection en cours…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-6 sm:py-10">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push("/cabinet-confidentiel-bf")}
          className="gap-1.5 w-fit"
        >
          <ArrowLeft size={14} /> Retour
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Nouvel Ordre de Mission</h1>
          <p className="text-xs sm:text-sm text-slate-500">Remplissez le formulaire puis publiez ou sauvegardez en brouillon.</p>
        </div>
      </div>

      {erreur && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-faso-red/30 bg-faso-red/10 px-4 py-3 text-sm text-faso-red">
          <AlertTriangle size={18} className="shrink-0" /> {erreur}
        </p>
      )}

      <div className="space-y-6">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>1 · Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="titre">Titre de la mission *</Label>
              <Input
                id="titre"
                placeholder="Ex : Recensement des élèves déscolarisés — Région du Liptako"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description détaillée *</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Décrivez le contexte, l'enjeu et le périmètre de la mission…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="objectifs">Objectifs à atteindre *</Label>
              <Textarea
                id="objectifs"
                rows={3}
                placeholder="1. Identifier le nombre d'élèves déscolarisés…&#10;2. Documenter les causes principales…"
                value={objectifs}
                onChange={(e) => setObjectifs(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="consignes">Consignes à respecter</Label>
              <Textarea
                id="consignes"
                rows={3}
                placeholder="Ne pas mentionner les noms complets des élèves mineurs…"
                value={consignes}
                onChange={(e) => setConsignes(e.target.value)}
              />
            </div>
            <div className="max-w-xs">
              <Label htmlFor="echeance">Échéance (facultatif)</Label>
              <Input
                id="echeance"
                type="date"
                value={echeance}
                onChange={(e) => setEcheance(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ciblage géographique */}
        <Card>
          <CardHeader>
            <CardTitle>2 · Portée géographique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="portee">Niveau de ciblage</Label>
              <Select
                id="portee"
                value={portee}
                onChange={(e) => setPortee(e.target.value as typeof portee)}
              >
                <option value="nationale">Nationale — tous les acteurs du Burkina Faso</option>
                <option value="regionale">Régionale — une région spécifique</option>
                <option value="provinciale">Provinciale — une province spécifique</option>
                <option value="communale">Communale — une commune spécifique</option>
              </Select>
            </div>
            {portee !== "nationale" && (
              <GeoSelector
                region={region}
                province={portee === "regionale" ? "" : province}
                commune={portee !== "communale" ? "" : commune}
                etablissement=""
                onChange={(patch) => {
                  if (patch.region !== undefined) setRegion(patch.region);
                  if (portee !== "regionale" && patch.province !== undefined) setProvince(patch.province);
                  if (portee === "communale" && patch.commune !== undefined) setCommune(patch.commune);
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Acteurs destinataires */}
        <Card>
          <CardHeader>
            <CardTitle>3 · Acteurs terrain destinataires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {TERRAIN_ROLES.map((r) => {
                const actif = rolesCibles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      actif
                        ? "border-institution bg-institution text-white"
                        : "border-slate-200 text-slate-700 hover:border-institution/40"
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {rolesCibles.length === 0
                ? "⚠️ Sélectionnez au moins un type d'acteur."
                : `${rolesCibles.length} type(s) d'acteur(s) ciblé(s).`}
            </p>
          </CardContent>
        </Card>

        {/* Aperçu */}
        <Card className="border-dashed border-slate-300 bg-slate-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Aperçu de la mission</p>
            <div className="flex flex-wrap gap-2">
              {portee === "nationale" ? (
                <Badge className="bg-blue-50 text-blue-600">Nationale</Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-600">
                  {commune || province || region || "Localisation non définie"}
                </Badge>
              )}
              {rolesCibles.map((r) => (
                <Badge key={r} className="bg-institution/10 text-institution text-xs">
                  {ROLE_LABELS[r]}
                </Badge>
              ))}
              {echeance && (
                <Badge className="bg-amber-50 text-amber-600">Échéance : {echeance}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
          <Button
            size="md"
            onClick={() => void soumettre("publier")}
            disabled={envoi}
            className="w-full sm:w-auto gap-2"
          >
            {envoi ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            Publier & Émettre la mission
          </Button>
          <Button
            size="md"
            variant="outline"
            onClick={() => void soumettre("brouillon")}
            disabled={envoi}
            className="w-full sm:w-auto"
          >
            Sauvegarder en brouillon
          </Button>
        </div>
      </div>
    </div>
  );
}

