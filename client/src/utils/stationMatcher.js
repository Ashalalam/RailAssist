import { api } from '../services/api';
import localDB from '../services/db';

/**
 * Station Matcher Utility
 * 
 * Fuzzy-matches extracted station names against Station Directory
 * Used by OCR and Voice AI workflows for station confirmation
 */

/**
 * Match extracted station text against Station Directory
 * 
 * @param {string} extractedText - Station name extracted from OCR/Voice
 * @param {boolean} isOnline - Network connectivity status
 * @returns {Promise<Object>} Match result with type and suggestions
 */
export async function matchStation(extractedText, isOnline = true) {
  if (!extractedText || typeof extractedText !== 'string') {
    return { type: 'empty', suggestions: [] };
  }

  const trimmed = extractedText.trim();
  if (trimmed.length === 0) {
    return { type: 'empty', suggestions: [] };
  }

  try {
    let matches = [];

    if (isOnline) {
      // Try online API search first
      try {
        const data = await api.stations.search(trimmed);
        matches = data.stations || [];
      } catch (apiError) {
        console.warn('Online station search failed, using offline cache:', apiError);
        matches = await searchOfflineStations(trimmed);
      }
    } else {
      // Offline: search IndexedDB
      matches = await searchOfflineStations(trimmed);
    }

    // Prioritize exact matches
    const exactCodeMatch = matches.find(s => 
      s.code.toUpperCase() === trimmed.toUpperCase()
    );
    
    if (exactCodeMatch) {
      return {
        type: 'exact',
        station: exactCodeMatch,
        suggestions: [exactCodeMatch]
      };
    }

    const exactNameMatch = matches.find(s =>
      s.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (exactNameMatch) {
      return {
        type: 'exact',
        station: exactNameMatch,
        suggestions: [exactNameMatch]
      };
    }

    // Multiple matches require user confirmation
    if (matches.length > 1) {
      return {
        type: 'ambiguous',
        suggestions: matches.slice(0, 5), // Limit to top 5
        originalText: trimmed
      };
    }

    // Single match (high confidence)
    if (matches.length === 1) {
      return {
        type: 'single',
        station: matches[0],
        suggestions: matches,
        originalText: trimmed
      };
    }

    // No matches found
    return {
      type: 'unmatched',
      suggestions: [],
      originalText: trimmed
    };
  } catch (error) {
    console.error('Station matching error:', error);
    return {
      type: 'error',
      suggestions: [],
      originalText: trimmed,
      error: error.message
    };
  }
}

/**
 * Search offline IndexedDB for station matches
 * 
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of matching stations
 */
async function searchOfflineStations(query) {
  try {
    await localDB.init();
    const allStations = await localDB.getAll('stations');
    const lowerQuery = query.toLowerCase();
    
    // Exact code match (highest priority)
    const exactCodeMatches = allStations.filter(s =>
      s.code.toLowerCase() === lowerQuery
    );
    
    if (exactCodeMatches.length > 0) {
      return exactCodeMatches;
    }

    // Exact name match
    const exactNameMatches = allStations.filter(s =>
      s.name.toLowerCase() === lowerQuery
    );

    if (exactNameMatches.length > 0) {
      return exactNameMatches;
    }

    // Partial matches (code starts with or name contains)
    const partialMatches = allStations.filter(s =>
      s.code.toLowerCase().startsWith(lowerQuery) ||
      s.name.toLowerCase().includes(lowerQuery)
    );

    return partialMatches.slice(0, 10); // Limit results
  } catch (error) {
    console.error('Offline station search failed:', error);
    return [];
  }
}

/**
 * Batch match multiple station fields
 * 
 * @param {Object} stationFields - Object with station field names and values
 * @param {boolean} isOnline - Network connectivity
 * @returns {Promise<Object>} Object with match results for each field
 */
export async function batchMatchStations(stationFields, isOnline = true) {
  const results = {};

  for (const [fieldName, value] of Object.entries(stationFields)) {
    if (value && typeof value === 'string' && value.trim().length > 0) {
      results[fieldName] = await matchStation(value, isOnline);
    } else {
      results[fieldName] = { type: 'empty', suggestions: [] };
    }
  }

  return results;
}

/**
 * Get display label for match type
 * 
 * @param {string} type - Match type (exact, single, ambiguous, unmatched, error, empty)
 * @returns {string} Human-readable label
 */
export function getMatchTypeLabel(type) {
  switch (type) {
    case 'exact':
      return 'Exact Match';
    case 'single':
      return 'Suggested Match';
    case 'ambiguous':
      return 'Multiple Matches';
    case 'unmatched':
      return 'No Match Found';
    case 'error':
      return 'Search Error';
    case 'empty':
      return 'No Input';
    default:
      return 'Unknown';
  }
}

export default {
  matchStation,
  batchMatchStations,
  getMatchTypeLabel
};
