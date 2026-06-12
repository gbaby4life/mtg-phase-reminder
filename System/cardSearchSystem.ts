import cardNamesRaw from "../Data/cardNames.json";

export type CardNameRecord = {
  name: string;
};

const CARD_NAMES = cardNamesRaw as CardNameRecord[];

export function searchCardNames(query: string, limit = 10): CardNameRecord[] {
  const cleanQuery = query.trim().toLowerCase();

  if (cleanQuery.length < 2) return [];

  const startsWithMatches: CardNameRecord[] = [];
  const includesMatches: CardNameRecord[] = [];

  for (const card of CARD_NAMES) {
    const name = card.name.toLowerCase();
    if (name.startsWith(cleanQuery)) {
      startsWithMatches.push(card);
      if (startsWithMatches.length >= limit) break;
    } else if (name.includes(cleanQuery)) {
      includesMatches.push(card);
    }
  }

  return [...startsWithMatches, ...includesMatches].slice(0, limit);
}