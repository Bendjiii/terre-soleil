// ============================================================
// Calculs astronomiques : révolution terrestre, déclinaison et heure solaire
// ============================================================

export const PI = Math.PI;
export const DEG = PI / 180;
export const RAD = 180 / PI;

/** Inclinaison de l'axe de rotation terrestre par rapport à la perpendiculaire à l'écliptique */
export const OBLIQUITY = 23.44;

/** Jours repères de l'année (calendrier sur 365 jours) */
export const DAY_SPRING_EQUINOX = 80; // 21 mars
export const DAY_SUMMER_SOLSTICE = 172; // 21 juin
export const DAY_AUTUMN_EQUINOX = 266; // 23 septembre
export const DAY_WINTER_SOLSTICE = 355; // 21 décembre

export interface MilestoneInfo {
  day: number;
  shortLabel: string;
  title: string;
  seasonName: string;
}

export const MILESTONES: MilestoneInfo[] = [
  {
    day: DAY_SPRING_EQUINOX,
    shortLabel: "21 mars",
    title: "Équinoxe de printemps",
    seasonName: "Printemps",
  },
  {
    day: DAY_SUMMER_SOLSTICE,
    shortLabel: "21 juin",
    title: "Solstice d'été",
    seasonName: "Été",
  },
  {
    day: DAY_AUTUMN_EQUINOX,
    shortLabel: "23 sept.",
    title: "Équinoxe d'automne",
    seasonName: "Automne",
  },
  {
    day: DAY_WINTER_SOLSTICE,
    shortLabel: "21 déc.",
    title: "Solstice d'hiver",
    seasonName: "Hiver",
  },
];

const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/**
 * Retourne la date formatée en français correspondant au jour de l'année (1 à 365).
 */
export function getDateLabel(day: number): string {
  const clamped = Math.max(1, Math.min(365, Math.round(day)));
  const date = new Date(2025, 0, clamped);
  const d = date.getDate();
  const dayStr = d === 1 ? "1er" : String(d);
  return `${dayStr} ${MONTHS_FR[date.getMonth()]}`;
}

/**
 * Formate l'heure solaire (0 à 24) en "12 h 00".
 */
export function formatSolarTime(hour: number): string {
  const normalized = Math.max(0, Math.min(24, hour));
  const totalMinutes = Math.round(normalized * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/**
 * Angle orbital (longitude solaire écliptique, en radians) synchronisé sur les 4 repères :
 * - Jour 80 (21 mars)  -> 0 rad (Équinoxe de printemps)
 * - Jour 172 (21 juin) -> π/2 rad (Solstice d'été)
 * - Jour 266 (23 sept) -> π rad (Équinoxe d'automne)
 * - Jour 355 (21 déc)  -> 3π/2 rad (Solstice d'hiver)
 */
export function getOrbitalAngle(day: number): number {
  const d = ((day - 1) % 365) + 1;

  if (d >= DAY_SPRING_EQUINOX && d < DAY_SUMMER_SOLSTICE) {
    const t = (d - DAY_SPRING_EQUINOX) / (DAY_SUMMER_SOLSTICE - DAY_SPRING_EQUINOX);
    return t * (PI / 2);
  }
  if (d >= DAY_SUMMER_SOLSTICE && d < DAY_AUTUMN_EQUINOX) {
    const t = (d - DAY_SUMMER_SOLSTICE) / (DAY_AUTUMN_EQUINOX - DAY_SUMMER_SOLSTICE);
    return PI / 2 + t * (PI / 2);
  }
  if (d >= DAY_AUTUMN_EQUINOX && d < DAY_WINTER_SOLSTICE) {
    const t = (d - DAY_AUTUMN_EQUINOX) / (DAY_WINTER_SOLSTICE - DAY_AUTUMN_EQUINOX);
    return PI + t * (PI / 2);
  }

  // Hiver : du jour 355 au jour 80 (+365 = 445), soit 90 jours
  const wrappedDay = d < DAY_SPRING_EQUINOX ? d + 365 : d;
  const span = DAY_SPRING_EQUINOX + 365 - DAY_WINTER_SOLSTICE; // 90 jours
  const t = (wrappedDay - DAY_WINTER_SOLSTICE) / span;
  return 1.5 * PI + t * (PI / 2);
}

/**
 * Calcule la déclinaison solaire exacte (en degrés, entre -23,44° et +23,44°).
 * sin(δ) = sin(ε) · sin(λ)
 */
export function getDeclination(day: number): number {
  const angle = getOrbitalAngle(day);
  const eps = OBLIQUITY * DEG;
  const sinDecl = Math.sin(eps) * Math.sin(angle);
  return Math.asin(Math.max(-1, Math.min(1, sinDecl))) * RAD;
}

/**
 * Formate la déclinaison solaire avec signe et virgule française (ex : "+23,4°", "0,0°", "-23,4°").
 */
export function formatDeclination(declDeg: number): string {
  const rounded = Math.abs(declDeg) < 0.05 ? 0 : declDeg;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1).replace(".", ",")}°`;
}

/**
 * Saison dans l'hémisphère Nord + événement astronomique exact aux équinoxes et solstices.
 */
export function getSeasonInfo(day: number): {
  season: string;
  milestone: string | null;
} {
  const d = Math.round(day);

  let season: string;
  if (d >= DAY_WINTER_SOLSTICE || d < DAY_SPRING_EQUINOX) {
    season = "Hiver (hémisphère Nord)";
  } else if (d < DAY_SUMMER_SOLSTICE) {
    season = "Printemps (hémisphère Nord)";
  } else if (d < DAY_AUTUMN_EQUINOX) {
    season = "Été (hémisphère Nord)";
  } else {
    season = "Automne (hémisphère Nord)";
  }

  let milestone: string | null = null;
  if (Math.abs(d - DAY_SPRING_EQUINOX) <= 1) {
    milestone = "Équinoxe de printemps";
  } else if (Math.abs(d - DAY_SUMMER_SOLSTICE) <= 1) {
    milestone = "Solstice d'été";
  } else if (Math.abs(d - DAY_AUTUMN_EQUINOX) <= 1) {
    milestone = "Équinoxe d'automne";
  } else if (Math.abs(d - DAY_WINTER_SOLSTICE) <= 1) {
    milestone = "Solstice d'hiver";
  }

  return { season, milestone };
}

/**
 * Vecteur unitaire pointant de la Terre vers le Soleil dans le repère de l'écliptique :
 * - +X : droite (position de la Terre au solstice d'été -> Soleil à -X)
 * - +Y : nord écliptique (perpendiculaire au plan orbital)
 * - +Z : vers l'avant (position de la Terre à l'équinoxe de printemps à -Z -> Soleil à +Z)
 */
export function getSunDirectionEcliptic(day: number): {
  x: number;
  y: number;
  z: number;
} {
  const angle = getOrbitalAngle(day);
  return {
    x: -Math.sin(angle),
    y: 0,
    z: Math.cos(angle),
  };
}

/**
 * Calcule l'angle de rotation propre de la Terre (rotation.y dans le repère incliné de 23,44°)
 * pour la vue de profil (rayons solaires arrivant de la gauche, direction Soleil = -X) :
 * - à 12 h 00 (midi solaire), le méridien d'origine (0° longitude, France / Greenwich) fait face au Soleil ;
 * - lorsque l'heure augmente (0 h -> 24 h), la Terre tourne d'ouest en est (+rotation.y).
 */
export function getEarthSpinAngle(day: number, hour: number): number {
  const angle = getOrbitalAngle(day);
  const eps = OBLIQUITY * DEG;

  // Direction du Soleil (-1, 0, 0) exprimée dans le repère local de tiltGroup
  // (après rotation.y(-angle) puis rotation.x(+eps))
  const sunLocalX = -Math.cos(angle);
  const sunLocalZ = Math.sin(angle) * Math.cos(eps);

  // À rotation.y = 0, la longitude 0° (u = 0.5) pointe selon +X local.
  // Une rotation +φ autour de +Y amène (+1, 0, 0) vers (cos φ, 0, -sin φ).
  const phiNoon = Math.atan2(-sunLocalZ, sunLocalX);
  const hourOffset = (hour - 12) * 15 * DEG;
  return phiNoon + hourOffset;
}
