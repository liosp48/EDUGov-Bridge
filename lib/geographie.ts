// ─────────────────────────────────────────────────────────────────
// Découpage administratif simplifié du Burkina Faso
// Région → Province → Commune → Établissement
// (Données réalistes, échantillon pour le MVP — à enrichir avec le
// référentiel SIG-Éducation du Ministère pour la version production)
// ─────────────────────────────────────────────────────────────────

export interface GeoNode {
  nom: string;
  provinces: { nom: string; communes: { nom: string; etablissements: string[] }[] }[];
}

export const GEO_BURKINA: GeoNode[] = [
  {
    nom: "Centre",
    provinces: [
      {
        nom: "Kadiogo",
        communes: [
          {
            nom: "Ouagadougou",
            etablissements: [
              "Lycée Bogodogo",
              "Lycée Charles Lavigerie",
              "CES Gounghin",
              "École Primaire Publique Nonghin",
            ],
          },
          {
            nom: "Saaba",
            etablissements: ["CEG Saaba", "ÉPP Gaskaye", "Lycée Privé La Semaine"],
          },
        ],
      },
    ],
  },
  {
    nom: "Hauts-Bassins",
    provinces: [
      {
        nom: "Houet",
        communes: [
          {
            nom: "Bobo-Dioulasso",
            etablissements: [
              "Lycée Ouezzin Coulibaly",
              "Lycée Municipal",
              "CES Sarfalao",
              "ÉPP Binja III",
            ],
          },
          {
            nom: "Bama",
            etablissements: ["CEG Bama", "ÉPP Doalé"],
          },
        ],
      },
      {
        nom: "Tuy",
        communes: [
          {
            nom: "Houndé",
            etablissements: ["Lycée Provincial Houndé", "CEG Doankuy"],
          },
        ],
      },
    ],
  },
  {
    nom: "Sahel",
    provinces: [
      {
        nom: "Séno",
        communes: [
          {
            nom: "Dori",
            etablissements: ["Lycée Provincial de Dori", "CEG Falagountou", "ÉPP Oudablagou"],
          },
          {
            nom: "Gorom-Gorom",
            etablissements: ["CEG Gorom-Gorom", "ÉPP Anderka-Bouyam"],
          },
        ],
      },
      {
        nom: "Oudalan",
        communes: [
          {
            nom: "Tin-Akoff",
            etablissements: ["École Primaire Tin-Akoff"],
          },
        ],
      },
    ],
  },
  {
    nom: "Est",
    provinces: [
      {
        nom: "Gourma",
        communes: [
          {
            nom: "Fada N'Gourma",
            etablissements: ["Lycée Diendi", "CES Zanlougou", "ÉPP Fada-Basga"],
          },
          {
            nom: "Matiakoali",
            etablissements: ["CEG Matiakoali", "ÉPP Nignan"],
          },
        ],
      },
    ],
  },
  {
    nom: "Sud-Ouest",
    provinces: [
      {
        nom: "Nahouri",
        communes: [
          {
            nom: "Pô",
            etablissements: ["CEG Pô", "ÉPP Bicouré"],
          },
        ],
      },
      {
        nom: "Bougouriba",
        communes: [
          {
            nom: "Diébougou",
            etablissements: ["Lycée Diébougou", "CEG Sloulou"],
          },
        ],
      },
    ],
  },
  {
    nom: "Centre-Ouest",
    provinces: [
      {
        nom: "Boulkiemdé",
        communes: [
          {
            nom: "Koudougou",
            etablissements: ["Lycée Provincial de Koudougou", "CES Zondoma", "ÉPP Sancé"],
          },
        ],
      },
    ],
  },
  {
    nom: "Centre-Nord",
    provinces: [
      {
        nom: "Sanmatenga",
        communes: [
          {
            nom: "Kaya",
            etablissements: ["Lycée Provincial de Kaya", "CEG Manéssè"],
          },
          {
            nom: "Barsalogho",
            etablissements: ["CEG Barsalogho", "ÉPP Namissiguima"],
          },
        ],
      },
    ],
  },
  {
    nom: "Boucle du Mouhoun",
    provinces: [
      {
        nom: "Mouhoun",
        communes: [
          {
            nom: "Dédougou",
            etablissements: ["Lycée Provincial de Dédougou", "CEG Abalama"],
          },
        ],
      },
    ],
  },
  {
    nom: "Cascades",
    provinces: [
      {
        nom: "Comoé",
        communes: [
          {
            nom: "Banfora",
            etablissements: ["Lycée Provincial de Banfora", "ÉPP Tingréla"],
          },
        ],
      },
    ],
  },
  {
    nom: "Centre-Est",
    provinces: [
      {
        nom: "Kouritenga",
        communes: [
          {
            nom: "Koupéla",
            etablissements: ["CEG Koupéla", "ÉPP Tankoussou"],
          },
        ],
      },
    ],
  },
  {
    nom: "Nord",
    provinces: [
      {
        nom: "Yatenga",
        communes: [
          {
            nom: "Ouahigouya",
            etablissements: ["Lycée Ouwe", "CEG Séguénéga"],
          },
        ],
      },
    ],
  },
  {
    nom: "Plateau-Central",
    provinces: [
      {
        nom: "Ganzourgou",
        communes: [
          {
            nom: "Zorgho",
            etablissements: ["CEG Zorgho", "ÉPP Gongzoungou"],
          },
        ],
      },
    ],
  },
  {
    nom: "Centre-Sud",
    provinces: [
      {
        nom: "Bazèga",
        communes: [
          {
            nom: "Kombissiri",
            etablissements: ["CEG Kombissiri", "ÉPP Bado"],
          },
        ],
      },
    ],
  },
];

export const REGIONS = GEO_BURKINA.map((r) => r.nom);

export function provincesOf(region: string): string[] {
  return GEO_BURKINA.find((r) => r.nom === region)?.provinces.map((p) => p.nom) ?? [];
}

export function communesOf(region: string, province: string): string[] {
  return (
    GEO_BURKINA.find((r) => r.nom === region)
      ?.provinces.find((p) => p.nom === province)
      ?.communes.map((c) => c.nom) ?? []
  );
}

export function etablissementsOf(region: string, province: string, commune: string): string[] {
  return (
    GEO_BURKINA.find((r) => r.nom === region)
      ?.provinces.find((p) => p.nom === province)
      ?.communes.find((c) => c.nom === commune)?.etablissements ?? []
  );
}
