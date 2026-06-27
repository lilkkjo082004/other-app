class SelectOption {
  final String value;
  final String label;
  final String emoji;
  const SelectOption({required this.value, required this.label, required this.emoji});
}

class ActivityData {
  final String id;
  final String label;
  final String emoji;
  final List<String> subs;
  const ActivityData({required this.id, required this.label, required this.emoji, required this.subs});
}

class BuilderCategory {
  final String id;
  final String label;
  final List<String> options;
  const BuilderCategory({required this.id, required this.label, required this.options});
}

// ═══════════════════════════════════════════
// ACTIVITIES
// ═══════════════════════════════════════════
const List<ActivityData> activities = [
  ActivityData(id: 'movies', label: 'Movies/TV', emoji: '🎬', subs: ['Action','Comedy','Horror','Drama','Romance','Sci-Fi','Fantasy','Thriller','Documentary','Anime','Reality TV','K-Drama']),
  ActivityData(id: 'gaming', label: 'Gaming', emoji: '🎮', subs: ['RPGs','Shooters','Puzzle','Strategy','Sports','Indie','Mobile','Retro','MMOs','Battle Royale','Simulation']),
  ActivityData(id: 'reading', label: 'Reading', emoji: '📚', subs: ['Fiction','Non-Fiction','Fantasy','Sci-Fi','Romance','Thriller','Manga','Self-Help','Biography','Poetry','Horror']),
  ActivityData(id: 'music', label: 'Music', emoji: '🎵', subs: ['Hip-Hop/Rap','R&B','Pop','Rock','Jazz','Classical','Electronic','Country','K-Pop','Latin','Indie','Metal','Afrobeats']),
  ActivityData(id: 'fitness', label: 'Working Out', emoji: '💪', subs: ['Weights','Cardio','Yoga','Martial Arts','Dance Fitness','Climbing','Swimming','CrossFit','Pilates','Running']),
  ActivityData(id: 'cooking', label: 'Cooking', emoji: '🍳', subs: ['Baking','Grilling','Meal Prep','Experimenting','Comfort Food','Healthy Eating','International','Desserts']),
  ActivityData(id: 'outdoors', label: 'Outdoors', emoji: '🌲', subs: ['Hiking','Camping','Fishing','Beach','Gardening','Bird Watching','Climbing','Kayaking','Stargazing']),
  ActivityData(id: 'art', label: 'Art & Design', emoji: '🎨', subs: ['Drawing','Painting','Digital Art','Photography','Graphic Design','Sculpture','Crafts','Fashion Design']),
  ActivityData(id: 'sports', label: 'Sports', emoji: '⚽', subs: ['Basketball','Football','Soccer','Baseball','Tennis','Golf','MMA/Boxing','Volleyball','Hockey','Watching','Playing']),
  ActivityData(id: 'travel', label: 'Travel', emoji: '✈️', subs: ['Road Trips','International','Beach','City Exploring','Adventure','Backpacking','Cruises','Solo Travel']),
  ActivityData(id: 'dancing', label: 'Dancing', emoji: '💃', subs: ['Hip-Hop','Salsa','Contemporary','Ballet','Swing','Freestyle','Ballroom','TikTok']),
  ActivityData(id: 'writing', label: 'Writing', emoji: '✍️', subs: ['Journaling','Fiction','Poetry','Blogging','Songwriting','Screenwriting','Fan Fiction']),
  ActivityData(id: 'socializing', label: 'Socializing', emoji: '🎉', subs: ['Parties','Game Nights','Bar/Club','Dinner Parties','Concerts','Festivals','Coffee Dates']),
  ActivityData(id: 'selfcare', label: 'Self-Care', emoji: '🧘', subs: ['Meditation','Skincare','Spa Days','Therapy','Aromatherapy','Journaling','Long Baths']),
  ActivityData(id: 'learning', label: 'Learning', emoji: '🧠', subs: ['Languages','Online Courses','Podcasts','History','Science','Philosophy','Tech/Coding']),
];

// ═══════════════════════════════════════════
// CUISINES
// ═══════════════════════════════════════════
const List<String> cuisines = [
  'Italian','Mexican','Korean','Japanese','Chinese','Indian','Thai','American',
  'Mediterranean','Caribbean','Soul Food','French','Vietnamese','Ethiopian',
  'Greek','Middle Eastern','Brazilian','Filipino','Jamaican','Southern/BBQ',
];

const List<String> dietaryOptions = [
  'No restrictions','Vegetarian','Vegan','Pescatarian','Halal','Kosher',
  'Gluten-Free','Dairy-Free','Keto','Lactose Intolerant',
];

// ═══════════════════════════════════════════
// BUILDER CATEGORIES
// ═══════════════════════════════════════════
const List<BuilderCategory> builderPersonality = [
  BuilderCategory(id: 'demeanor', label: 'Demeanor', options: ['Warm','Edgy','Calm','Chaotic','Mysterious','Playful']),
  BuilderCategory(id: 'energy', label: 'Energy', options: ['Laid back','High energy','Balanced']),
  BuilderCategory(id: 'humor', label: 'Humor', options: ['Light','Dark','Dry','Goofy','Sarcastic','Witty']),
  BuilderCategory(id: 'emotionalDepth', label: 'Emotional Depth', options: ['Light & fun','Emotionally open','Deeply intense']),
  BuilderCategory(id: 'socialEnergy', label: 'Social Energy', options: ['Introverted homebody','Selectively social','Life of the party']),
];

const List<BuilderCategory> builderRelationship = [
  BuilderCategory(id: 'romance', label: 'Romantic Energy', options: ['None','Some warmth','Intense','Slow burn']),
  BuilderCategory(id: 'protectiveness', label: 'Protectiveness', options: ['Independent','Gently protective','Fiercely protective']),
  BuilderCategory(id: 'commStyle', label: 'Communication', options: ['Direct','Expressive','Chill','Poetic']),
  BuilderCategory(id: 'archetype', label: 'Fantasy Archetype', options: ['Best friend','Older sibling','Mentor','Romantic interest','Chaos agent']),
  BuilderCategory(id: 'interest', label: 'Interest Leaning', options: ['Creative','Technical','Physical','Intellectual','Fashion/Style']),
];
