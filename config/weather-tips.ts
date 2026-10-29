// Farming tip rules for the 7-day forecast (PRD 6.4: rules live in config, not in the UI).
// Agronomists can tune these numbers without touching any page. Tip wording is in locales/*.json
// under "weather.tip_<rule id>".

export type WeatherTipRules = {
  heavyRain: { minRainMm: number };
  dryspell: { minDays: number; maxRainMmPerDay: number };
  heat: { minTempMaxC: number };
};

export const weatherTipRules: WeatherTipRules = {
  // A day with this much rain or more: delay fertiliser and spraying (it washes off).
  heavyRain: { minRainMm: 20 },
  // This many days in a row, each with less rain than this: mulch, irrigate seedlings.
  dryspell: { minDays: 5, maxRainMmPerDay: 1 },
  // A day this hot or hotter: work and water early or late.
  heat: { minTempMaxC: 35 },
};
