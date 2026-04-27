/**
 * Event classification and utilities for athletics events
 */

export type EventCategory = 
  | 'sprint' 
  | 'middle_distance' 
  | 'long_distance' 
  | 'hurdles' 
  | 'jumps' 
  | 'throws' 
  | 'combined' 
  | 'relay' 
  | 'walk';

export type PerformanceDirection = 'lower_better' | 'higher_better';

export interface EventClassification {
  category: EventCategory;
  direction: PerformanceDirection;
  unit: 's' | 'm' | 'pts' | '';
}

/**
 * Classifies an athletics event by category and performance direction
 */
export function classifyEvent(eventName: string): EventClassification {
  const normalized = eventName.toLowerCase();
  
  // Throws - higher is better, measured in meters
  if (/(shot put|discus|javelin|hammer|throw)/i.test(normalized)) {
    return { category: 'throws', direction: 'higher_better', unit: 'm' };
  }
  
  // Jumps - higher/farther is better, measured in meters
  if (/(long jump|triple jump|high jump|pole vault|jump)/i.test(normalized)) {
    return { category: 'jumps', direction: 'higher_better', unit: 'm' };
  }
  
  // Combined events - higher is better (points)
  if (/(decathlon|heptathlon|pentathlon)/i.test(normalized)) {
    return { category: 'combined', direction: 'higher_better', unit: 'pts' };
  }
  
  // Everything else is time-based - lower is better
  return { 
    category: determineRunningCategory(normalized), 
    direction: 'lower_better', 
    unit: 's' 
  };
}

/**
 * Determines the running category for time-based events
 */
function determineRunningCategory(eventName: string): EventCategory {
  if (/hurdles/i.test(eventName)) return 'hurdles';
  if (/relay|4x/i.test(eventName)) return 'relay';
  if (/walk/i.test(eventName)) return 'walk';
  if (/(100|200|400)m/i.test(eventName)) return 'sprint';
  if (/(800|1500|mile)/i.test(eventName)) return 'middle_distance';
  if (/(3000|5000|10000|marathon)/i.test(eventName)) return 'long_distance';
  return 'sprint'; // default
}

/**
 * Formats a performance mark with appropriate units
 */
export function formatPerformance(mark: string | null, eventName: string): string {
  if (!mark) return '—';
  
  const classification = classifyEvent(eventName);
  
  // If mark already has the unit, return as is
  if (mark.includes(classification.unit)) {
    return mark;
  }
  
  // Clean the mark value (keep numbers, dots, colons)
  const cleanMark = mark.replace(/[^\d.:]/g, '');
  
  if (!cleanMark) return mark; // Return original if we can't parse it
  
  // Add appropriate unit
  if (classification.unit) {
    return `${cleanMark}${classification.unit}`;
  }
  
  return cleanMark;
}

/**
 * Normalizes event names for comparison
 * Used to match personal best disciplines with athlete events
 */
export function normalizeEventName(eventName: string): string {
  return eventName
    .toLowerCase()
    .replace(/^men's\s+/gi, '')      // Remove "Men's " prefix at start
    .replace(/^women's\s+/gi, '')    // Remove "Women's " prefix at start
    .replace(/^mixed\s+/gi, '')      // Remove "Mixed " prefix at start
    .replace(/\s*metres?\s*/gi, 'm') // Convert "metres" to "m"
    .replace(/\s+/g, ' ')            // Normalize whitespace to single space
    .trim();
}

/**
 * Checks if a personal best discipline matches an athlete's event
 * Uses exact matching to prevent incorrect associations (e.g., "100m" vs "100m Hurdles")
 */
export function isEventMatch(discipline: string, athleteEvent: string): boolean {
  if (!discipline || !athleteEvent) return false;
  
  const normalized1 = normalizeEventName(discipline);
  const normalized2 = normalizeEventName(athleteEvent);
  
  // Exact match - primary matching strategy
  if (normalized1 === normalized2) return true;
  
  // Allow equipment/specification variations to match base event
  // e.g., "100m hurdles (76.2cm)" should match "100m hurdles"
  // but "100m" should NOT match "100m hurdles"
  const withoutSpecs1 = normalized1.replace(/\s*\([^)]*\)/g, '').trim();
  const withoutSpecs2 = normalized2.replace(/\s*\([^)]*\)/g, '').trim();
  
  if (withoutSpecs1 === withoutSpecs2) return true;
  
  // No fuzzy matching - events must match exactly
  return false;
}
