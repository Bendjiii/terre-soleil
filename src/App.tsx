import { useEffect, useId, useRef, useState } from "react";
import { Compass, Info, Pause, Play, RotateCcw } from "lucide-react";
import {
  DAY_SPRING_EQUINOX,
  MILESTONES,
  formatDeclination,
  formatSolarTime,
  getDateLabel,
  getDeclination,
  getSeasonInfo,
} from "./astronomy";
import { EarthGlobe3D, type EarthGlobe3DHandle } from "./components/EarthGlobe3D";
import { OrbitCanvas2D } from "./components/OrbitCanvas2D";

const DEFAULT_DAY = DAY_SPRING_EQUINOX; // 21 mars (équinoxe de printemps)
const DEFAULT_HOUR = 12; // 12 h 00 (midi solaire)

interface AstroTooltipProps {
  label: string;
  explanation: string;
}

function AstroTooltip({ label, explanation }: AstroTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`Explication : ${label}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <Info className="w-3.5 h-3.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-30 w-64 sm:w-72 p-3 rounded-lg bg-slate-900 text-slate-100 text-xs leading-relaxed text-left shadow-lg border border-slate-700/80 pointer-events-none"
        >
          <div className="font-semibold text-amber-300 mb-1">{label}</div>
          <p>{explanation}</p>
          <span
            aria-hidden="true"
            className="absolute top-full left-1/2 -translate-x-1/2 w-2.5 h-2.5 -mt-1.5 rotate-45 bg-slate-900 border-r border-b border-slate-700/80"
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [day, setDay] = useState<number>(DEFAULT_DAY);
  const [hour, setHour] = useState<number>(DEFAULT_HOUR);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const globeRef = useRef<EarthGlobe3DHandle | null>(null);

  // Boucle d'animation annuelle (1 à 365 jours en continu)
  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setDay((prev) => (prev >= 365 ? 1 : prev + 1));
    }, 90);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setDay(DEFAULT_DAY);
    setHour(DEFAULT_HOUR);
    globeRef.current?.resetView();
  };

  const dateLabel = getDateLabel(day);
  const timeLabel = formatSolarTime(hour);
  const declination = getDeclination(day);
  const declinationLabel = formatDeclination(declination);
  const { season, milestone } = getSeasonInfo(day);

  return (
    <div className="min-h-screen bg-[#eef2f7] text-slate-900 py-5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1260px] mx-auto space-y-5">
        {/* En-tête pédagogique */}
        <header className="text-center space-y-1.5">
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
            style={{ textWrap: "balance" }}
          >
            La Terre autour du Soleil
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Comprendre les saisons, l&apos;inclinaison de l&apos;axe terrestre (23,44°) et
            l&apos;alternance jour / nuit
          </p>
        </header>

        {/* Deux animations côte à côte, de même hauteur et de même importance visuelle */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          {/* Panneau de gauche : Globe terrestre 3D */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                1. Éclairement de la Terre (Globe 3D)
              </h2>
              <button
                type="button"
                onClick={() => globeRef.current?.resetView()}
                title="Revenir à la vue de profil face à la frontière jour/nuit"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Compass className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                Vue de profil
              </button>
            </div>

            <div className="w-full h-[360px] sm:h-[420px] rounded-lg overflow-hidden bg-[#030614]">
              <EarthGlobe3D ref={globeRef} day={day} hour={hour} />
            </div>

            <p className="mt-2.5 text-xs text-slate-500 text-center">
              Clic gauche : tourner dans toutes les directions · Molette : zoomer · Clic droit :
              déplacer
            </p>

            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e9c879] border border-amber-500/40" />
                Face éclairée (Jour)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#060d24]" />
                Face nocturne (Nuit)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-400 rounded-full" />
                Axe incliné (23,44°)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-400 rounded-full" />
                Équateur &amp; Tropiques
              </span>
            </div>
          </section>

          {/* Panneau de droite : Révolution autour du Soleil */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                2. Révolution autour du Soleil
              </h2>
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
                Orbite sur 365 jours
              </span>
            </div>

            <div className="w-full h-[360px] sm:h-[420px] rounded-lg overflow-hidden bg-[#081226]">
              <OrbitCanvas2D day={day} />
            </div>

            <p className="mt-2.5 text-xs text-slate-500 text-center">
              L&apos;axe de rotation terrestre reste parallèle à lui-même tout au long de
              l&apos;année
            </p>

            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Soleil
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3898ec]" />
                Terre
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 border-t-2 border-dashed border-slate-500" />
                Orbite terrestre
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-400 rounded-full" />
                Axe incliné (23,44°)
              </span>
            </div>
          </section>
        </main>

        {/* Panneau de commandes et données astronomiques */}
        <section
          aria-label="Commandes et paramètres astronomiques"
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Curseur 1 : Jour de l'année (1 à 365) */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="day-slider" className="text-sm font-semibold text-slate-800">
                  Jour de l&apos;année (1 à 365)
                </label>
                <span className="font-mono-tabular text-sm font-semibold text-blue-700">
                  {dateLabel} · Jour {day}
                </span>
              </div>

              <input
                id="day-slider"
                type="range"
                min={1}
                max={365}
                step={1}
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="astro-slider"
              />

              {/* Accès direct aux équinoxes et solstices */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                {MILESTONES.map((m) => {
                  const isActive = Math.abs(day - m.day) <= 1;
                  return (
                    <button
                      key={m.day}
                      type="button"
                      onClick={() => setDay(m.day)}
                      title={m.title}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                        isActive
                          ? "bg-blue-700 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {m.shortLabel} · {m.seasonName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Curseur 2 : Heure solaire (0 h à 24 h) */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="hour-slider" className="text-sm font-semibold text-slate-800">
                  Heure solaire (0 h à 24 h)
                </label>
                <span className="font-mono-tabular text-sm font-semibold text-blue-700">
                  {timeLabel}
                </span>
              </div>

              <input
                id="hour-slider"
                type="range"
                min={0}
                max={24}
                step={0.25}
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="astro-slider"
              />

              <div className="flex items-center justify-between text-xs text-slate-500 font-mono-tabular pt-1">
                <span>0 h</span>
                <span>6 h</span>
                <span>12 h (midi)</span>
                <span>18 h</span>
                <span>24 h</span>
              </div>
            </div>
          </div>

          {/* Boutons de lecture, pause et réinitialisation */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handlePlay}
              disabled={isPlaying}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                isPlaying
                  ? "bg-blue-800 text-white/90 cursor-default"
                  : "bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
              }`}
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              Animation annuelle
            </button>

            <button
              type="button"
              onClick={handlePause}
              disabled={!isPlaying}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                !isPlaying
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-800 hover:bg-slate-900 text-white cursor-pointer"
              }`}
            >
              <Pause className="w-4 h-4" aria-hidden="true" />
              Pause
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Réinitialiser
            </button>
          </div>

          {/* Affichage des grandeurs astronomiques */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-center">
            <div className="py-2.5 px-3 rounded-lg bg-slate-50">
              <div className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600">
                <span>Date sélectionnée</span>
                <AstroTooltip
                  label="Date sélectionnée"
                  explanation="Indique la position de la Terre sur son orbite de 365 jours autour du Soleil. À chaque date correspond une orientation différente de l'axe terrestre par rapport aux rayons solaires."
                />
              </div>
              <div className="mt-1 text-base sm:text-lg font-bold text-slate-900 font-mono-tabular">
                {dateLabel}
              </div>
            </div>

            <div className="py-2.5 px-3 rounded-lg bg-slate-50">
              <div className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600">
                <span>Saison (hémisphère Nord)</span>
                <AstroTooltip
                  label="Saison (hémisphère Nord)"
                  explanation="Les saisons s'expliquent par l'inclinaison de 23,44° de l'axe terrestre, et non par la distance au Soleil. Lorsque l'hémisphère Nord penche vers le Soleil (été), il reçoit les rayons plus directement et les jours sont plus longs."
                />
              </div>
              <div className="mt-1 text-base sm:text-lg font-bold text-slate-900">
                {season}
              </div>
              {milestone && (
                <div className="mt-0.5 text-xs font-semibold text-amber-700">{milestone}</div>
              )}
            </div>

            <div className="py-2.5 px-3 rounded-lg bg-slate-50">
              <div className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600">
                <span>Déclinaison solaire</span>
                <AstroTooltip
                  label="Déclinaison solaire"
                  explanation="Angle entre les rayons du Soleil et le plan de l'équateur terrestre (compris entre −23,4° et +23,4°). Elle vaut 0° aux équinoxes (21 mars et 23 sept.), +23,4° au solstice d'été et −23,4° au solstice d'hiver."
                />
              </div>
              <div className="mt-1 text-base sm:text-lg font-bold text-blue-700 font-mono-tabular">
                {declinationLabel}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
