import { useMemo } from 'react';
import { CommandRegistry } from '@/config/commandRegistry';

/**
 * Calculate fuzzy match score between query and text
 * Returns a score from 0 to 100, where 100 is an exact match
 * 
 * Algorithm:
 * - First character must match (or be close)
 * - Consecutive matches are preferred (better score)
 * - Earlier matches are preferred
 * - Missing characters reduce score
 */
function calculateFuzzyScore(query: string, text: string): number {
  if (!query || !text) return 0;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower === queryLower) return 100;
  if (textLower.includes(queryLower)) return 85;

  let score = 0;
  let queryIdx = 0;
  let textIdx = 0;
  let consecutive = 0;
  let earlyMatches = 0;

  while (queryIdx < queryLower.length && textIdx < textLower.length) {
    if (queryLower[queryIdx] === textLower[textIdx]) {
      score += 10;

      // Boost for consecutive matches
      if (consecutive > 0) score += 5;
      consecutive++;

      // Boost for early matches
      if (textIdx < 5) earlyMatches++;

      queryIdx++;
      textIdx++;
    } else {
      consecutive = 0;
      textIdx++;
    }
  }

  // If not all query characters were found, reduce score heavily
  if (queryIdx < queryLower.length) {
    return Math.max(0, score - (queryLower.length - queryIdx) * 20);
  }

  // Add position bonus (earlier in text is better)
  const positionBonus = Math.max(0, 30 - textIdx / 2);
  const earlyBonus = earlyMatches * 5;

  return Math.min(100, score + positionBonus + earlyBonus);
}

export interface FuzzySearchResult {
  item: CommandRegistry;
  score: number;
}

/**
 * Fuzzy search hook for command palette
 * Performs case-insensitive fuzzy matching against multiple fields
 * 
 * Searches across:
 * - Label (highest priority)
 * - Description (medium priority)
 * - Keywords (medium priority)
 * 
 * Results are automatically sorted by score (descending)
 * Filters out items with score < 20 (too low to be relevant)
 */
export function useFuzzySearch(
  query: string,
  items: CommandRegistry[]
): FuzzySearchResult[] {
  return useMemo(() => {
    if (!query.trim()) {
      return items.map((item) => ({ item, score: 0 }));
    }

    const results = items
      .map((item) => {
        // Score label (highest weight)
        let score = calculateFuzzyScore(query, item.label) * 1.5;

        // Score description if exists
        if (item.description) {
          const descScore = calculateFuzzyScore(query, item.description);
          score = Math.max(score, descScore * 1.0);
        }

        // Score keywords if exists
        if (item.keywords.length > 0) {
          const keywordScores = item.keywords.map((kw) =>
            calculateFuzzyScore(query, kw)
          );
          const bestKeywordScore = Math.max(...keywordScores);
          score = Math.max(score, bestKeywordScore * 1.2);
        }

        return { item, score };
      })
      .filter((result) => result.score > 20) // Only show relevant results
      .sort((a, b) => b.score - a.score); // Sort by relevance DESC

    return results;
  }, [query, items]);
}
