// ─────────────────────────────────────────────────────────────────────────
// RÉFÉRENTIEL GÉOGRAPHIQUE OFFICIEL — BURKINA FASO (découpage 2025)
// 17 régions · 47 provinces · 351 communes (toponymes endogènes)
//
// Base réglementaire : décrets adoptés en Conseil des ministres du
// 2 juillet 2025 (et publiés au J.O. le 7 août 2025) portant :
//   · réorganisation du territoire : 13 → 17 régions, 45 → 47 provinces ;
//   · changement de toponymes des régions (langues nationales) ;
//   · renommage de 4 provinces : Sanmatenga → Sandbondtenga,
//     Oubritenga → Bassitenga, Soum → Djelgodji, Kossi → Kossin ;
//   · nouvelles provinces : Dyamongou (Kantchari) et Karo-Peli (Arbinda).
// Le découpage communal (351 communes, 5ᵉ RGPH / INSD 2019) est inchangé.
//
// ⚠️ RÉFÉRENTIEL UNIQUE : aucune autre liste de régions/provinces/communes
// ne doit exister ailleurs dans l'application. Les établissements scolaires
// sont saisis librement (texte) — jamais figés dans ce référentiel.
// Pour une future mise à jour : éditer uniquement ce fichier.
// ─────────────────────────────────────────────────────────────────────────

export interface ProvinceGeo {
  nom: string;
  /** Ancienne dénomination si la province a été renommée en 2025 */
  ancien?: string;
  communes: string[];
}

export interface RegionGeo {
  /** Nouveau toponyme endogène officiel (ex : « Kuilsé ») */
  nom: string;
  /** Ancienne dénomination (ex : « Centre-Nord ») si renommée/créée en 2025 */
  ancien?: string;
  chefLieu: string;
  provinces: ProvinceGeo[];
}

export const GEO_BURKINA: RegionGeo[] = [
  {
    nom: "Bankui",
    ancien: "Boucle du Mouhoun",
    chefLieu: "Dédougou",
    provinces: [
      { nom: "Balé", communes: ["Bagassi", "Bana", "Boromo", "Fara", "Oury", "Pâ", "Pompoï", "Poura", "Siby", "Yaho"] },
      { nom: "Banwa", communes: ["Balavé", "Kouka", "Sami", "Sanaba", "Solenzo", "Tansila"] },
      { nom: "Mouhoun", communes: ["Bondokuy", "Dédougou", "Douroula", "Kona", "Ouarkoye", "Safané", "Tchériba"] },
    ],
  },
  {
    nom: "Djôrô",
    ancien: "Sud-Ouest",
    chefLieu: "Gaoua",
    provinces: [
      { nom: "Bougouriba", communes: ["Bondigui", "Diébougou", "Dolo", "Iolonioro", "Tiankoura"] },
      { nom: "Ioba", communes: ["Dano", "Dissin", "Guéguéré", "Koper", "Niégo", "Oronkua", "Ouessa", "Zambo"] },
      { nom: "Noumbiel", communes: ["Batié", "Boussoukoula", "Kpuéré", "Legmoin", "Midébdo"] },
      { nom: "Poni", communes: ["Bouroum-Bouroum", "Bousséra", "Djigoué", "Gaoua", "Gbomblora", "Kampti", "Loropéni", "Malba", "Nako", "Périgban"] },
    ],
  },
  {
    nom: "Goulmou",
    ancien: "Est",
    chefLieu: "Fada N'Gourma",
    provinces: [
      { nom: "Gourma", communes: ["Diabo", "Diapangou", "Fada N'Gourma", "Matiacoali", "Tibga", "Yamba"] },
      { nom: "Kompienga", communes: ["Kompienga", "Madjoari", "Pama"] },
    ],
  },
  {
    nom: "Guiriko",
    ancien: "Hauts-Bassins",
    chefLieu: "Bobo-Dioulasso",
    provinces: [
      { nom: "Houet", communes: ["Bama", "Bobo-Dioulasso", "Dandé", "Faramana", "Fô", "Karangasso-Sambla", "Karangasso-Vigué", "Koundougou", "Léna", "Padéma", "Péni", "Satiri", "Toussiana"] },
      { nom: "Kénédougou", communes: ["Banzon", "Djigouéra", "Kangala", "Kayan", "Koloko", "Kourinion", "Kourouma", "Morolaba", "N'Dorola", "Orodara", "Samogohiri", "Samorogouan", "Sindo"] },
      { nom: "Tuy", communes: ["Békuy", "Béréba", "Boni", "Founzan", "Houndé", "Koti", "Koumbia"] },
    ],
  },
  {
    nom: "Kadiogo",
    ancien: "Centre",
    chefLieu: "Ouagadougou",
    provinces: [
      { nom: "Kadiogo", communes: ["Komki-Ipala", "Komsilga", "Koubri", "Ouagadougou", "Pabré", "Saaba", "Tanghin-Dassouri"] },
    ],
  },
  {
    nom: "Kuilsé",
    ancien: "Centre-Nord",
    chefLieu: "Kaya",
    provinces: [
      { nom: "Bam", communes: ["Bourzanga", "Guibaré", "Kongoussi", "Nasséré", "Rollo", "Rouko", "Sabcé", "Tikaré", "Zimtenga"] },
      { nom: "Namentenga", communes: ["Boala", "Boulsa", "Bouroum", "Dargo", "Nagbingou", "Tougouri", "Yalgo", "Zéguédéguin"] },
      { nom: "Sandbondtenga", ancien: "Sanmatenga", communes: ["Barsalogho", "Boussouma", "Dablo", "Kaya", "Korsimoro", "Mané", "Namissiguima", "Pensa", "Pibaoré", "Pissila", "Ziga"] },
    ],
  },
  {
    nom: "Liptako",
    ancien: "Sahel",
    chefLieu: "Dori",
    provinces: [
      { nom: "Oudalan", communes: ["Déou", "Gorom-Gorom", "Markoye", "Oursi", "Tin-Akoff"] },
      { nom: "Séno", communes: ["Bani", "Dori", "Falagountou", "Gorgadji", "Sampelga", "Seytenga"] },
      { nom: "Yagha", communes: ["Boundoré", "Mansila", "Sébba", "Solhan", "Tankougounadié", "Titabé"] },
    ],
  },
  {
    nom: "Nando",
    ancien: "Centre-Ouest",
    chefLieu: "Koudougou",
    provinces: [
      { nom: "Boulkiemdé", communes: ["Bingo", "Imasgo", "Kindi", "Kokologho", "Koudougou", "Nandiala", "Nanoro", "Pella", "Poa", "Ramongo", "Sabou", "Siglé", "Soaw", "Sourgou", "Thyou"] },
      { nom: "Sanguié", communes: ["Dassa", "Didyr", "Godyr", "Kordié", "Kyon", "Pouni", "Réo", "Ténado", "Zam", "Zawara"] },
      { nom: "Sissili", communes: ["Biéha", "Boura", "Léo", "Nébiélianayou", "Niabouri", "Silly", "Tô"] },
      { nom: "Ziro", communes: ["Bakata", "Bougnounou", "Cassou", "Dalo", "Gao", "Sapouy"] },
    ],
  },
  {
    nom: "Nakambé",
    ancien: "Centre-Est",
    chefLieu: "Tenkodogo",
    provinces: [
      { nom: "Boulgou", communes: ["Bagré", "Bané", "Béguédo", "Bissiga", "Bitou", "Boussouma", "Garango", "Komtoèga", "Niaogho", "Tenkodogo", "Zabré", "Zoaga", "Zonsé"] },
      { nom: "Koulpélogo", communes: ["Comin-Yanga", "Dourtenga", "Lalgaye", "Ouargaye", "Sangha", "Soudougui", "Yargatenga", "Yondé"] },
      { nom: "Kouritenga", communes: ["Andemtenga", "Baskouré", "Dialgaye", "Gounghin", "Kando", "Koupéla", "Pouytenga", "Tensobentenga", "Yargo"] },
    ],
  },
  {
    nom: "Nazinon",
    ancien: "Centre-Sud",
    chefLieu: "Manga",
    provinces: [
      { nom: "Bazèga", communes: ["Doulougou", "Gaongo", "Ipelcé", "Kayao", "Kombissiri", "Saponé", "Toécé"] },
      { nom: "Nahouri", communes: ["Guiaro", "Pô", "Tiébélé", "Zecco", "Ziou"] },
      { nom: "Zoundwéogo", communes: ["Béré", "Bindé", "Gogo", "Gomboussougou", "Guiba", "Manga", "Nobéré"] },
    ],
  },
  {
    nom: "Oubri",
    ancien: "Plateau-Central",
    chefLieu: "Ziniaré",
    provinces: [
      { nom: "Ganzourgou", communes: ["Boudry", "Kogho", "Méguet", "Mogtédo", "Salogo", "Zam", "Zorgho", "Zoungou"] },
      { nom: "Bassitenga", ancien: "Oubritenga", communes: ["Absouya", "Dapélogo", "Loumbila", "Nagréongo", "Ourgou-Manéga", "Ziniaré", "Zitenga"] },
      { nom: "Kourwéogo", communes: ["Boussé", "Laye", "Niou", "Sourgoubila", "Toéghin"] },
    ],
  },
  {
    nom: "Sirba",
    ancien: "Est",
    chefLieu: "Bogandé",
    provinces: [
      { nom: "Gnagna", communes: ["Bilanga", "Bogandé", "Coalla", "Liptougou", "Manni", "Piéla", "Thion"] },
      { nom: "Komondjari", communes: ["Bartiébougou", "Foutouri", "Gayéri"] },
    ],
  },
  {
    nom: "Soum",
    ancien: "Sahel",
    chefLieu: "Djibo",
    provinces: [
      { nom: "Djelgodji", ancien: "Soum", communes: ["Baraboulé", "Djibo", "Djiguel", "Kelbo", "Nassoumbou", "Pobé-Mengao", "Tongomayel"] },
      { nom: "Karo-Peli", communes: ["Arbinda", "Koutougou"] },
    ],
  },
  {
    nom: "Tannounyan",
    ancien: "Cascades",
    chefLieu: "Banfora",
    provinces: [
      { nom: "Comoé", communes: ["Banfora", "Bérégadougou", "Mangodara", "Moussodougou", "Niangoloko", "Ouo", "Sidéradougou", "Soubakaniédougou", "Tiéfora"] },
      { nom: "Léraba", communes: ["Dakoro", "Douna", "Kankalaba", "Loumana", "Niankorodougou", "Ouéléni", "Sindou", "Wolonkoto"] },
    ],
  },
  {
    nom: "Tapoa",
    ancien: "Est",
    chefLieu: "Diapaga",
    provinces: [
      { nom: "Dyamongou", communes: ["Botou", "Kantchari"] },
      { nom: "Gobnangou", ancien: "Tapoa", communes: ["Diapaga", "Logobou", "Namounou", "Partiaga", "Tambaga", "Tansarga"] },
    ],
  },
  {
    nom: "Sourou",
    ancien: "Boucle du Mouhoun",
    chefLieu: "Tougan",
    provinces: [
      { nom: "Kossin", ancien: "Kossi", communes: ["Barani", "Bomborokuy", "Bourasso", "Djibasso", "Dokuy", "Doumbala", "Kombori", "Madouba", "Nouna", "Sono"] },
      { nom: "Nayala", communes: ["Gassan", "Gossina", "Kougny", "Toma", "Yaba", "Yé"] },
      { nom: "Sourou", communes: ["Di", "Gomboro", "Kassoum", "Kiembara", "Lanfièra", "Lankoué", "Toéni", "Tougan"] },
    ],
  },
  {
    nom: "Yaadga",
    ancien: "Nord",
    chefLieu: "Ouahigouya",
    provinces: [
      { nom: "Loroum", communes: ["Banh", "Ouindigui", "Sollé", "Titao"] },
      { nom: "Passoré", communes: ["Arbollé", "Bagaré", "Bokin", "Gomponsom", "Kirsi", "Lâ-Todin", "Pilimpikou", "Samba", "Yako"] },
      { nom: "Yatenga", communes: ["Barga", "Kaïn", "Kalsaka", "Kossouka", "Koumbri", "Namissiguima", "Ouahigouya", "Oula", "Rambo", "Séguénéga", "Tangaye", "Thiou", "Zogoré"] },
      { nom: "Zondoma", communes: ["Bassi", "Boussou", "Gourcy", "Léba", "Tougo"] },
    ],
  },
];

// ── Accesseurs ─────────────────────────────────────────────────────────

export const REGIONS = GEO_BURKINA.map((r) => r.nom);

/** Nombre de régions officielles (17 — découpage 2025) */
export const NB_REGIONS = GEO_BURKINA.length;

export function regionDe(region: string): RegionGeo | undefined {
  return GEO_BURKINA.find((r) => r.nom === region);
}

export function provincesOf(region: string): string[] {
  return regionDe(region)?.provinces.map((p) => p.nom) ?? [];
}

export function communesOf(region: string, province: string): string[] {
  return (
    regionDe(region)
      ?.provinces.find((p) => p.nom === province)
      ?.communes ?? []
  );
}

/** Chef-lieu régional (ex : Kaya pour Kuilsé) */
export function chefLieuOf(region: string): string {
  return regionDe(region)?.chefLieu ?? "";
}

/** Nom courant (nouveau toponyme) d'une région */
export function nomCourantRegion(region: string): string {
  return regionDe(region)?.nom ?? region;
}

/** Province est-elle référencée dans le référentiel ? */
export function provinceConnue(region: string, province: string): boolean {
  return provincesOf(region).some(
    (p) => p.toLowerCase() === province.trim().toLowerCase()
  );
}

/** Commune est-elle référencée dans le référentiel ? */
export function communeConnue(region: string, province: string, commune: string): boolean {
  return communesOf(region, province).some(
    (c) => c.toLowerCase() === commune.trim().toLowerCase()
  );
}

// ── Normalisation des anciennes appellations (données historiques) ────
// Les enregistrements antérieurs à juillet 2025 peuvent contenir
// l'ancien découpage 13 régions : on les convertit automatiquement
// pour garantir la cohérence des tableaux de bord et rapports.

const REGION_ANCIEN_VERS_NOUVEAU: Record<string, string> = {
  "boucle du mouhoun": "Bankui",
  "sud-ouest": "Djôrô",
  hautsbassins: "Guiriko",
  "hauts-bassins": "Guiriko",
  centre: "Kadiogo",
  "centre-nord": "Kuilsé",
  "centre-ouest": "Nando",
  "centre-est": "Nakambé",
  "centre-sud": "Nazinon",
  "plateau-central": "Oubri",
  cascades: "Tannounyan",
  nord: "Yaadga",
  // Régions scindées en 2025 → rattachement par défaut
  est: "Goulmou",
  sahel: "Liptako",
};

const PROVINCE_ANCIEN_VERS_NOUVEAU: Record<string, string> = {
  sanmatenga: "Sandbondtenga",
  oubritenga: "Bassitenga",
  soum: "Djelgodji",
  kossi: "Kossin",
  // L'ex-province Tapoa (partie conservée) devient Gobnangou
  tapoa: "Gobnangou",
};

function normaliserCle(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Convertit une ancienne dénomination régionale (13 régions) en toponyme officiel 2025 */
export function normaliserRegion(region: string): string {
  const cle = normaliserCle(region);
  return REGION_ANCIEN_VERS_NOUVEAU[cle] ?? regionDe(region)?.nom ?? region;
}

/**
 * Convertit un couple (région, province) hérité de l'ancien découpage.
 * Retourne toujours un couple cohérent avec le référentiel 2025 —
 * les valeurs inconnues (subdivisions non répertoriées) sont conservées telles quelles.
 */
export function normaliserGeo(
  region: string,
  province: string
): { region: string; province: string } {
  const regionN = normaliserRegion(region);
  const r = regionDe(regionN);

  if (!province || !r) return { region: regionN, province };

  let provinceN = province.trim();

  // 1) Renommages directs (Sanmatenga → Sandbondtenga, …)
  const renommee = PROVINCE_ANCIEN_VERS_NOUVEAU[normaliserCle(provinceN)];
  if (renommee) provinceN = renommee;

  // 2) La province existe déjà → renvoi du nom officiel (casse normalisée)
  const existe = r.provinces.find(
    (p) => normaliserCle(p.nom) === normaliserCle(provinceN)
  );
  if (existe) return { region: regionN, province: existe.nom };

  // 3) Ancienne dénomination de province attachée à cette région ?
  const viaAncien = r.provinces.find(
    (p) => p.ancien && normaliserCle(p.ancien) === normaliserCle(provinceN)
  );
  if (viaAncien) return { region: regionN, province: viaAncien.nom };

  // 4) Subdivision non répertoriée : conservée telle quelle (saisie libre)
  return { region: regionN, province: provinceN };
}
