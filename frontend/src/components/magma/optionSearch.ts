// The searches of OptionPicker.vue, the search field of the L2 and L3 sheets (parent use cases and ATT&CK techniques).

export interface Option {
  id: string; // e.g. 'T1566.001' or 'DOS-1'
  name: string; // e.g. 'Phishing: Spearphishing Attachment' or 'DDoS detection'
}

/** The options that match what is typed, in their original order: every typed word is part of the ID or the name. */
export function searchOptions(options: Option[], query: string): Option[] {
  return options.filter(matcher(query, (word, id) => id.includes(word)));
}

/**
 * The techniques that match what is typed, in their original order. Every typed word must be the start of the ID (with
 * or without the T) or a part of the name, ignoring case: '1566', 'T1566.00', 'spear attach' and '1566 spear' all work.
 */
export function searchTechniques(techniques: Option[], query: string): Option[] {
  return techniques.filter(matcher(query, (word, id) => id.startsWith(word) || id.startsWith(`t${word}`)));
}

// Whether an option matches all typed words, ignoring case: either by its ID, as idMatches says, or by its name.
function matcher(query: string, idMatches: (word: string, id: string) => boolean) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return ({ id, name }: Option) => {
    const lowerId = id.toLowerCase();
    const lowerName = name.toLowerCase();
    return words.every((word) => idMatches(word, lowerId) || lowerName.includes(word));
  };
}
