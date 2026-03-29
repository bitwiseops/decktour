const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const CHECK_IN_RADIUS = 200; // meters
export const EXACT_RADIUS = 100; // meters
export const EXACT_BONUS = 50;
export const QUIZ_CORRECT_BONUS = 25;
export const DEFAULT_BASE_SCORE = 100;
export const TIME_EXPIRED_PENALTY = 25;
export const INTUITION_BONUS_MAX = 100; // only hard hint revealed
export const INTUITION_BONUS_MEDIUM = 40; // medium hint revealed

export interface ScoreBreakdown {
  locationScore: number;
  exactBonus: number;
  intuitionBonus: number;
  quizScore: number;
  timePenalty: number;
  total: number;
}

export function calculateIntuitionBonus(hintsRevealed: number, locationValid: boolean): number {
  if (!locationValid) return 0;
  if (hintsRevealed <= 1) return INTUITION_BONUS_MAX;   // solo hard hint → max bonus
  if (hintsRevealed === 2) return INTUITION_BONUS_MEDIUM; // medium sbloccato → bonus ridotto
  return 0; // easy sbloccato → nessun bonus
}

export function calculateCheckInScore(
  distanceMeters: number,
  baseScore: number,
  quizCorrect: number,
  timerExpired: boolean = false,
  hintsRevealed: number = 1,
): ScoreBreakdown {
  const locationValid = distanceMeters <= CHECK_IN_RADIUS;
  const locationExact = distanceMeters <= EXACT_RADIUS;

  const locationScore = locationValid ? baseScore : 0;
  const exactBonus = locationExact ? EXACT_BONUS : 0;
  const intuitionBonus = calculateIntuitionBonus(hintsRevealed, locationExact);
  const quizScore = quizCorrect * QUIZ_CORRECT_BONUS;
  const timePenalty = timerExpired ? TIME_EXPIRED_PENALTY : 0;

  return {
    locationScore,
    exactBonus,
    intuitionBonus,
    quizScore,
    timePenalty,
    total: Math.max(0, locationScore + exactBonus + intuitionBonus + quizScore - timePenalty),
  };
}
