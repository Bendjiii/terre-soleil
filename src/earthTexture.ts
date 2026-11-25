import * as THREE from "three";

// ============================================================
// Génération procédurale haute résolution de la texture terrestre
// (zéro dépendance réseau externe, projection équirectangulaire exacte)
// ============================================================

type LonLatRing = [number, number][];

/**
 * Pol简化 géographiques [longitude, latitude] en degrés pour les continents et grandes îles.
 * Projection équirectangulaire : x = (lon + 180) / 360 * W, y = (90 - lat) / 180 * H.
 */
const CONTINENT_POLYGONS: LonLatRing[] = [
  // Amérique du Nord & Centrale
  [
    [-168, 66], [-162, 70], [-141, 70], [-128, 70], [-115, 69], [-96, 70],
    [-82, 69], [-78, 63], [-64, 60], [-55, 52], [-60, 46], [-67, 45],
    [-70, 42], [-75, 35], [-81, 31], [-80, 25], [-83, 29], [-90, 29],
    [-97, 26], [-96, 19], [-90, 21], [-87, 21], [-88, 16], [-83, 15],
    [-83, 10], [-78, 8], [-80, 9], [-85, 11], [-92, 14], [-105, 19],
    [-110, 24], [-114, 31], [-117, 32], [-122, 37], [-124, 42], [-124, 48],
    [-130, 54], [-138, 59], [-147, 61], [-152, 59], [-161, 56], [-166, 60],
  ],
  // Île de Baffin & archipel arctique canadien
  [
    [-85, 73], [-72, 72], [-62, 67], [-66, 62], [-74, 64], [-82, 68],
  ],
  [
    [-122, 74], [-104, 74], [-98, 70], [-115, 69], [-123, 72],
  ],
  // Cuba & Hispaniola
  [
    [-85, 22], [-78, 22], [-74, 20], [-80, 20],
  ],
  // Groenland
  [
    [-72, 77], [-50, 82], [-22, 82], [-18, 76], [-22, 70], [-36, 66],
    [-44, 60], [-52, 64], [-55, 71], [-68, 76],
  ],
  // Islande
  [
    [-24, 66], [-14, 66], [-15, 64], [-23, 64],
  ],
  // Amérique du Sud
  [
    [-78, 9], [-72, 12], [-63, 11], [-52, 5], [-49, 0], [-35, -6],
    [-38, -13], [-40, -21], [-48, -26], [-53, -33], [-58, -38], [-64, -41],
    [-67, -46], [-69, -52], [-67, -55], [-73, -54], [-75, -47], [-72, -37],
    [-71, -29], [-70, -18], [-77, -12], [-81, -5], [-79, 2],
  ],
  // Grande-Bretagne
  [
    [-6, 58], [-2, 58], [1.7, 52.5], [1, 51], [-5.2, 50], [-4.5, 53], [-5.5, 56],
  ],
  // Irlande
  [
    [-10, 54], [-6, 55], [-6.5, 52], [-10, 51.5],
  ],
  // Europe continentale + Scandinavie + Italie + Grèce + Eurasie occidentale
  [
    [-9, 37], [-9, 43], [-2, 43.5], [-4.5, 48.3], [2, 51], [6, 53.5],
    [8.5, 54.5], [8, 57], [11, 57.5], [12, 55.5], [10.5, 54], [14, 54],
    [19, 54.5], [22, 57], [28, 60], [21, 61], [24, 65.5], [21, 65],
    [17.5, 61], [18, 59], [16, 56], [13, 55.5], [12, 57.5], [10.5, 59],
    [6, 58.2], [5, 61], [10, 64], [18, 69], [29, 71], [42, 67], [44, 65], [58, 69], [70, 73],
    [85, 74], [105, 77], [125, 73], [145, 71], [170, 69], [180, 66],
    [180, 62], [170, 60], [163, 56], [157, 51], [156, 58], [142, 54],
    [136, 45], [130, 42], [129, 35], [126, 35], [126, 39],
    [122, 40], [119, 39], [122, 37], [120, 34], [122, 30], [118, 24],
    [110, 20], [106, 21], [109, 13], [105, 9], [100, 13], [103, 2],
    [100, 6], [98, 16], [92, 22], [87, 21], [80, 13], [77, 8],
    [72, 20], [67, 25], [60, 25], [56, 26.5], [51, 25], [48.5, 30],
    [52, 24], [58, 23], [60, 22], [53, 16], [44, 12.5], [40, 20], [34, 28],
    [32.5, 31], [35, 34], [36, 36.5], [27, 36.5], [26, 40], [29, 41],
    [36, 42], [41, 41.5], [38, 45], [33, 45], [30, 46], [28, 42],
    [24, 38], [22, 37], [20, 40], [14, 45], [18, 40], [16, 38],
    [12.5, 41.5], [9, 44], [5, 43.3], [3, 42.5], [-0.5, 38], [-5.5, 36],
  ],
  // Sicile, Sardaigne, Corse
  [
    [12.5, 38], [15.5, 38], [15, 36.8], [12.5, 37.5],
  ],
  [
    [8.3, 41], [9.6, 41], [9.6, 39], [8.3, 39],
  ],
  // Afrique
  [
    [-6, 35.8], [10, 37], [12, 33], [20, 31], [32.5, 31.2], [35, 26],
    [40, 18], [43, 12.5], [51, 12], [47, 4], [41, -2], [40, -11],
    [35, -20], [33, -26], [28, -33], [20, -34.8], [17, -30], [14, -22],
    [12, -12], [12, -5], [9, 4], [4, 6], [-8, 5], [-14, 9], [-17.5, 15],
    [-16, 23], [-10, 30], [-6, 35.8],
  ],
  // Madagascar
  [
    [49.5, -12], [50.2, -16], [47.5, -25], [44, -25], [43.5, -20], [46.5, -15],
  ],
  // Sri Lanka
  [
    [80, 9.7], [81.8, 7.5], [80.5, 6], [79.8, 7.5],
  ],
  // Japon
  [
    [141, 45], [145, 43], [141, 38], [139.5, 35], [134, 34], [130, 31.5],
    [131, 34], [137, 37], [140, 41],
  ],
  // Taïwan & Philippines
  [
    [120.2, 25], [122, 25], [121, 22], [120.2, 23],
  ],
  [
    [120, 18.5], [122.5, 18], [126, 8], [123, 6], [120, 13],
  ],
  // Sumatra, Java, Bornéo, Sulawesi, Nouvelle-Guinée
  [
    [95.5, 5.5], [105.5, -5.8], [103.5, -6], [97, 1],
  ],
  [
    [105.5, -6.2], [114.5, -7.8], [114, -8.5], [105.5, -7],
  ],
  [
    [109, 1], [117, 6.8], [118.5, 1], [116, -3.8], [110, -3],
  ],
  [
    [119, 1], [125, 1.5], [122, -5], [119, -5.5],
  ],
  [
    [131, -1.5], [141, -2.5], [150, -10], [143, -9], [136, -5],
  ],
  // Australie
  [
    [129, -14], [136, -12], [136, -15], [141, -16], [142.5, -11], [146, -18],
    [153.5, -28], [150, -37], [144, -38.5], [137, -35], [131, -31.8],
    [122, -34], [115, -34.2], [114, -26], [119, -20], [124, -16],
  ],
  // Tasmanie
  [
    [144.8, -40.8], [148.2, -41], [147.2, -43.5], [145.3, -42.5],
  ],
  // Nouvelle-Zélande
  [
    [173, -35], [178.5, -37.8], [175, -41.5], [168, -46.5], [166.5, -45.5], [173, -40],
  ],
  // Antarctique
  [
    [-180, -72], [-150, -77], [-120, -74], [-90, -73], [-60, -64], [-55, -65],
    [-40, -77], [-10, -70], [30, -69], [65, -67], [95, -66], [135, -67],
    [168, -71], [172, -77], [180, -78], [180, -90], [-180, -90],
  ],
];

/** Mers fermées et grands lacs à découper dans l'Eurasie / Amérique du Nord */
const INLAND_SEAS: LonLatRing[] = [
  // Mer Caspienne
  [
    [47, 46], [53, 45], [54, 37], [50, 36.8], [48, 41],
  ],
  // Grands Lacs (simplifiés)
  [
    [-92, 47.5], [-84.5, 46.5], [-82, 43], [-76.5, 44], [-80, 46], [-87, 48.5],
  ],
];

function lonToX(lon: number, width: number): number {
  return ((lon + 180) / 360) * width;
}

function latToY(lat: number, height: number): number {
  return ((90 - lat) / 180) * height;
}

function traceRing(ctx: CanvasRenderingContext2D, ring: LonLatRing, w: number, h: number) {
  if (ring.length === 0) return;
  ctx.moveTo(lonToX(ring[0][0], w), latToY(ring[0][1], h));
  for (let i = 1; i < ring.length; i++) {
    ctx.lineTo(lonToX(ring[i][0], w), latToY(ring[i][1], h));
  }
  ctx.closePath();
}

/** Bruit pseudo-aléatoire déterministe pour texturer reliefs, côtes et déserts */
function hash2D(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2D(xi, yi);
  const b = hash2D(xi + 1, yi);
  const c = hash2D(xi, yi + 1);
  const d = hash2D(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number): number {
  return (
    valueNoise(x, y) * 0.55 +
    valueNoise(x * 2.1, y * 2.1) * 0.28 +
    valueNoise(x * 4.3, y * 4.3) * 0.17
  );
}

export interface EarthTextureBundle {
  colorMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Génère les textures équirectangulaires réalistes de la Terre (albédo, rugosité océan/terre, relief)
 * avec un rendu naturel des continents, océans, déserts, forêts et calottes polaires.
 */
export function createEarthTextures(maxAnisotropy = 4): EarthTextureBundle {
  const width = 2048;
  const height = 1024;

  // 1. Masque terre/mer haute précision
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = width;
  maskCanvas.height = height;
  const mCtx = maskCanvas.getContext("2d")!;

  mCtx.fillStyle = "#000000";
  mCtx.fillRect(0, 0, width, height);

  mCtx.fillStyle = "#ffffff";
  mCtx.beginPath();
  for (const poly of CONTINENT_POLYGONS) {
    traceRing(mCtx, poly, width, height);
  }
  mCtx.fill();

  mCtx.fillStyle = "#000000";
  mCtx.beginPath();
  for (const sea of INLAND_SEAS) {
    traceRing(mCtx, sea, width, height);
  }
  mCtx.fill();

  // Flou très léger sur le masque pour obtenir des plateaux continentaux naturels
  const shelfCanvas = document.createElement("canvas");
  shelfCanvas.width = width;
  shelfCanvas.height = height;
  const sCtx = shelfCanvas.getContext("2d")!;
  sCtx.filter = "blur(6px)";
  sCtx.drawImage(maskCanvas, 0, 0);
  sCtx.filter = "none";

  const landData = mCtx.getImageData(0, 0, width, height).data;
  const shelfData = sCtx.getImageData(0, 0, width, height).data;

  // 2. Canvases finaux : Albedo (colorMap), Roughness, Bump
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = width;
  colorCanvas.height = height;
  const cCtx = colorCanvas.getContext("2d")!;
  const colorImg = cCtx.createImageData(width, height);

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext("2d")!;
  const roughImg = rCtx.createImageData(width, height);

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext("2d")!;
  const bumpImg = bCtx.createImageData(width, height);

  const cBuf = colorImg.data;
  const rBuf = roughImg.data;
  const bBuf = bumpImg.data;

  for (let y = 0; y < height; y++) {
    const lat = 90 - (y / height) * 180;
    const absLat = Math.abs(lat);
    const nxBase = y * 0.015;

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lon = (x / width) * 360 - 180;

      const landMask = landData[idx] / 255;
      const shelfMask = shelfData[idx] / 255;
      const n = fbm(x * 0.018 + 3.1, nxBase + 1.7);
      const fine = valueNoise(x * 0.08, y * 0.08);

      if (landMask > 0.35) {
        // ---- CONTINENTS ----
        // Fonction douce (elliptique + bruit organique) pour éviter toute bordure rectangulaire
        const desertFalloff = (
          cLon: number,
          cLat: number,
          rLon: number,
          rLat: number
        ): number => {
          const dx = (lon - cLon) / rLon;
          const dy = (lat - cLat) / rLat;
          const d = Math.sqrt(dx * dx + dy * dy) + (n - 0.5) * 0.35;
          return Math.max(0, Math.min(1, 1 - (d - 0.45) / 0.55));
        };

        const aridStrength = Math.max(
          desertFalloff(16, 23, 30, 10),   // Sahara
          desertFalloff(46, 24, 15, 9),    // Péninsule Arabique / Iran
          desertFalloff(72, 41, 22, 8),    // Asie centrale / Gobi
          desertFalloff(131, -25, 13, 7),  // Désert australien
          desertFalloff(-110, 29, 9, 8)    // Sud-Ouest nord-américain
        );

        // Calottes glaciaires & neiges polaires avec transition naturelle
        const snowLat = absLat + (n - 0.5) * 10;
        const snowMask =
          lat < -62
            ? Math.max(0, Math.min(1, (-lat - 60) / 8))
            : Math.max(0, Math.min(1, (snowLat - 65) / 9));

        // Couleur de végétation naturelle (forêt tropicale -> tempérée -> boréale)
        const tropical = Math.max(0, 1 - absLat / 24);
        const boreal = Math.max(0, (absLat - 46) / 24);
        const vegBaseR = 46 * tropical + 66 * (1 - tropical) + boreal * 24;
        const vegBaseG = 104 * tropical + 114 * (1 - tropical) - boreal * 14;
        const vegBaseB = 40 * tropical + 54 * (1 - tropical) + boreal * 10;
        const reliefTint = (n - 0.5) * 42 + (fine - 0.5) * 16;

        let r = vegBaseR + reliefTint;
        let g = vegBaseG + reliefTint * 0.85;
        let b = vegBaseB + reliefTint * 0.6;

        // Mélange progressif vers les zones arides / steppes
        if (aridStrength > 0.01) {
          const aridMix = 0.55 + n * 0.45;
          const ar = 176 + aridMix * 34;
          const ag = 148 + aridMix * 28;
          const ab = 104 + aridMix * 22;
          r = r * (1 - aridStrength) + ar * aridStrength;
          g = g * (1 - aridStrength) + ag * aridStrength;
          b = b * (1 - aridStrength) + ab * aridStrength;
        }

        // Mélange progressif vers les neiges et glaces polaires
        if (snowMask > 0.01) {
          const sr = 228 + fine * 16;
          const sg = 236 + fine * 14;
          const sb = 244 + fine * 10;
          r = r * (1 - snowMask) + sr * snowMask;
          g = g * (1 - snowMask) + sg * snowMask;
          b = b * (1 - snowMask) + sb * snowMask;
        }

        r = Math.max(22, Math.min(248, Math.round(r)));
        g = Math.max(38, Math.min(250, Math.round(g)));
        b = Math.max(24, Math.min(252, Math.round(b)));

        rBuf[idx] = rBuf[idx + 1] = rBuf[idx + 2] = Math.round(218 * (1 - snowMask) + 150 * snowMask);
        bBuf[idx] = bBuf[idx + 1] = bBuf[idx + 2] = 128 + Math.round(n * 85);

        cBuf[idx] = r;
        cBuf[idx + 1] = g;
        cBuf[idx + 2] = b;
        cBuf[idx + 3] = 255;
      } else {
        // ---- OCÉANS ----
        const coastal = Math.min(1, shelfMask * 1.6);
        const abyssal = Math.max(0, 1 - coastal);
        const polarSeaIce =
          absLat > 78 + (n - 0.5) * 8;

        if (polarSeaIce) {
          cBuf[idx] = 215;
          cBuf[idx + 1] = 228;
          cBuf[idx + 2] = 240;
          rBuf[idx] = rBuf[idx + 1] = rBuf[idx + 2] = 145;
        } else {
          const oceanVar = (n - 0.5) * 14;
          const r = Math.max(8, Math.min(90, Math.round(11 * abyssal + 26 * coastal + oceanVar)));
          const g = Math.max(24, Math.min(145, Math.round(44 * abyssal + 96 * coastal + oceanVar)));
          const b = Math.max(65, Math.min(205, Math.round(98 * abyssal + 158 * coastal + oceanVar * 1.1)));

          cBuf[idx] = r;
          cBuf[idx + 1] = g;
          cBuf[idx + 2] = b;
          // Océans lisses pour un léger reflet solaire réaliste
          rBuf[idx] = rBuf[idx + 1] = rBuf[idx + 2] = 78;
        }
        bBuf[idx] = bBuf[idx + 1] = bBuf[idx + 2] = 85;
        cBuf[idx + 3] = 255;
      }
      rBuf[idx + 3] = 255;
      bBuf[idx + 3] = 255;
    }
  }

  cCtx.putImageData(colorImg, 0, 0);
  rCtx.putImageData(roughImg, 0, 0);
  bCtx.putImageData(bumpImg, 0, 0);

  // Subtil lissage des côtes pour une netteté optimale à tout niveau de zoom
  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = maxAnisotropy;
  colorMap.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  return {
    colorMap,
    roughnessMap,
    bumpMap,
    dispose: () => {
      colorMap.dispose();
      roughnessMap.dispose();
      bumpMap.dispose();
    },
  };
}
