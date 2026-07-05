export const STEPS = [
  'name', 'dob', 'ageGroup', 'vibe', 'communication', 'occupation',
  'relationship', 'loveLang', 'needs', 'socialId',
  'values', 'recharge', 'aboutYou', 'supportStyle',
  'activities', 'activitySubs', 'cuisineLove', 'cuisineDislike', 'dietary', 'favMovies', 'favMusic',
];

// Single-source option lists (used by both onboarding and the profile editor).
export const VIBES = [
  { v: 'calm', label: 'Calm & grounded', em: '🌿' },
  { v: 'playful', label: 'Playful & witty', em: '⚡' },
  { v: 'deep', label: 'Deep & introspective', em: '🌙' },
  { v: 'warm', label: 'Warm & nurturing', em: '☀️' },
  { v: 'chaotic', label: 'Chaotic & spontaneous', em: '🔥' },
];
export const COMMUNICATION = [
  { v: 'direct', label: 'Direct & honest', em: '🎯' },
  { v: 'expressive', label: 'Expressive & emotional', em: '💕' },
  { v: 'chill', label: 'Chill & easygoing', em: '😎' },
  { v: 'thoughtful', label: 'Thoughtful & considered', em: '📝' },
];
export const RELATIONSHIP = [
  { v: 'single', label: 'Single', em: '🦋' },
  { v: 'dating', label: 'Dating', em: '💫' },
  { v: 'partnered', label: 'In a relationship', em: '💕' },
  { v: 'married', label: 'Married', em: '💍' },
  { v: 'complicated', label: "It's complicated", em: '🌀' },
  { v: 'rather_not', label: 'Rather not say', em: '🤐' },
];
export const LOVE_LANG = [
  { v: 'words', label: 'Words of affirmation', em: '💬' },
  { v: 'quality', label: 'Quality time', em: '⏰' },
  { v: 'acts', label: 'Acts of service', em: '🤝' },
  { v: 'touch', label: 'Physical touch', em: '🤗' },
  { v: 'gifts', label: 'Receiving gifts', em: '🎁' },
];
export const NEEDS = [
  { v: 'encouragement', label: 'Someone who cheers me on', em: '🙌' },
  { v: 'honesty', label: 'Honest, real talk', em: '💎' },
  { v: 'fun', label: 'More laughter & fun', em: '😂' },
  { v: 'perspective', label: 'Fresh perspectives', em: '🔮' },
];
export const SOCIAL_ID = [
  { v: 'listener', label: 'The thoughtful listener', em: '👂' },
  { v: 'entertainer', label: 'Life of the party', em: '🎭' },
  { v: 'advisor', label: 'Go-to for advice', em: '🧭' },
  { v: 'dreamer', label: 'Creative dreamer', em: '💭' },
];

// Deeper "getting to know you" dimensions — who the person is, not just what
// they like. Fed into the companion system prompt so companions understand
// what someone cares about and how to show up for them.
export const VALUES = [
  { v: 'family', label: 'Family & close ties', em: '👨‍👩‍👧' },
  { v: 'growth', label: 'Growth & learning', em: '🌱' },
  { v: 'freedom', label: 'Freedom & independence', em: '🕊️' },
  { v: 'creativity', label: 'Creativity & self-expression', em: '🎨' },
  { v: 'connection', label: 'Deep connection', em: '🤝' },
  { v: 'adventure', label: 'Adventure & new experiences', em: '🧭' },
  { v: 'stability', label: 'Stability & security', em: '🏡' },
  { v: 'achievement', label: 'Ambition & achievement', em: '🏆' },
  { v: 'spirituality', label: 'Faith & spirituality', em: '🕯️' },
  { v: 'justice', label: 'Fairness & doing right', em: '⚖️' },
  { v: 'health', label: 'Health & wellbeing', em: '🌿' },
];
export const RECHARGE = [
  { v: 'alone', label: 'Quiet time alone', em: '🌙' },
  { v: 'closefriends', label: 'One-on-one with someone close', em: '💛' },
  { v: 'crowd', label: 'Big social energy', em: '🎉' },
  { v: 'nature', label: 'Getting outside in nature', em: '🌲' },
  { v: 'create', label: 'Making something', em: '🎨' },
  { v: 'move', label: 'Moving my body', em: '🏃' },
  { v: 'rest', label: 'Doing absolutely nothing', em: '🛋️' },
];
export const SUPPORT_STYLE = [
  { v: 'listen', label: 'Just listen — no fixing', em: '👂' },
  { v: 'advice', label: 'Honest advice & perspective', em: '💬' },
  { v: 'distract', label: 'Distraction & laughs', em: '😄' },
  { v: 'space', label: 'Space + a gentle check-in', em: '🌱' },
  { v: 'practical', label: 'Help me make a plan', em: '🗺️' },
  { v: 'encourage', label: "Remind me I've got this", em: '🙌' },
];

export const ACTIVITIES = [
  { id: 'movies', label: 'Movies/TV', em: '🎬', subs: ['Action', 'Comedy', 'Horror', 'Drama', 'Romance', 'Sci-Fi', 'Fantasy', 'Thriller', 'Documentary', 'Anime', 'Reality TV', 'K-Drama'] },
  { id: 'gaming', label: 'Gaming', em: '🎮', subs: ['RPGs', 'Shooters', 'Puzzle', 'Strategy', 'Sports', 'Indie', 'Mobile', 'Retro', 'MMOs', 'Battle Royale', 'Simulation'] },
  { id: 'reading', label: 'Reading', em: '📚', subs: ['Fiction', 'Non-Fiction', 'Fantasy', 'Sci-Fi', 'Romance', 'Thriller', 'Manga', 'Self-Help', 'Biography', 'Poetry', 'Horror'] },
  { id: 'music', label: 'Music', em: '🎵', subs: ['Hip-Hop/Rap', 'R&B', 'Pop', 'Rock', 'Jazz', 'Classical', 'Electronic', 'Country', 'K-Pop', 'Latin', 'Indie', 'Metal', 'Afrobeats'] },
  { id: 'fitness', label: 'Working Out', em: '💪', subs: ['Weights', 'Cardio', 'Yoga', 'Martial Arts', 'Dance Fitness', 'Climbing', 'Swimming', 'CrossFit', 'Pilates', 'Running'] },
  { id: 'cooking', label: 'Cooking', em: '🍳', subs: ['Baking', 'Grilling', 'Meal Prep', 'Experimenting', 'Comfort Food', 'Healthy Eating', 'International', 'Desserts'] },
  { id: 'outdoors', label: 'Outdoors', em: '🌲', subs: ['Hiking', 'Camping', 'Fishing', 'Beach', 'Gardening', 'Bird Watching', 'Climbing', 'Kayaking', 'Stargazing'] },
  { id: 'art', label: 'Art & Design', em: '🎨', subs: ['Drawing', 'Painting', 'Digital Art', 'Photography', 'Graphic Design', 'Sculpture', 'Crafts', 'Fashion Design'] },
  { id: 'sports', label: 'Sports', em: '⚽', subs: ['Basketball', 'Football', 'Soccer', 'Baseball', 'Tennis', 'Golf', 'MMA/Boxing', 'Volleyball', 'Hockey', 'Watching', 'Playing'] },
  { id: 'travel', label: 'Travel', em: '✈️', subs: ['Road Trips', 'International', 'Beach', 'City Exploring', 'Adventure', 'Backpacking', 'Cruises', 'Solo Travel'] },
  { id: 'dancing', label: 'Dancing', em: '💃', subs: ['Hip-Hop', 'Salsa', 'Contemporary', 'Ballet', 'Swing', 'Freestyle', 'Ballroom', 'TikTok'] },
  { id: 'writing', label: 'Writing', em: '✍️', subs: ['Journaling', 'Fiction', 'Poetry', 'Blogging', 'Songwriting', 'Screenwriting', 'Fan Fiction'] },
  { id: 'social', label: 'Socializing', em: '🎉', subs: ['Parties', 'Game Nights', 'Bar/Club', 'Dinner Parties', 'Concerts', 'Festivals', 'Coffee Dates'] },
  { id: 'selfcare', label: 'Self-Care', em: '🧘', subs: ['Meditation', 'Skincare', 'Spa Days', 'Therapy', 'Aromatherapy', 'Journaling', 'Long Baths'] },
  { id: 'learning', label: 'Learning', em: '🧠', subs: ['Languages', 'Online Courses', 'Podcasts', 'History', 'Science', 'Philosophy', 'Tech/Coding'] },
];

export const CUISINES = ['Italian', 'Mexican', 'Korean', 'Japanese', 'Chinese', 'Indian', 'Thai', 'American', 'Mediterranean', 'Caribbean', 'Soul Food', 'French', 'Vietnamese', 'Ethiopian', 'Greek', 'Middle Eastern', 'Brazilian', 'Filipino', 'Jamaican', 'Southern/BBQ'];

export const DIETARY = ['No restrictions', 'Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Lactose Intolerant'];

export const B_PERS = [
  { id: 'demeanor', label: 'Demeanor', opts: ['Warm', 'Edgy', 'Calm', 'Chaotic', 'Mysterious', 'Playful'] },
  { id: 'energy', label: 'Energy', opts: ['Laid back', 'High energy', 'Balanced'] },
  { id: 'humor', label: 'Humor', opts: ['Light', 'Dark', 'Dry', 'Goofy', 'Sarcastic', 'Witty'] },
  { id: 'emotionalDepth', label: 'Emotional Depth', opts: ['Light & fun', 'Emotionally open', 'Deeply intense'] },
  { id: 'socialEnergy', label: 'Social Energy', opts: ['Introverted homebody', 'Selectively social', 'Life of the party'] },
];

export const B_REL = [
  { id: 'romance', label: 'Romantic Energy', opts: ['None', 'Some warmth', 'Intense', 'Slow burn'] },
  { id: 'protectiveness', label: 'Protectiveness', opts: ['Independent', 'Gently protective', 'Fiercely protective'] },
  { id: 'commStyle', label: 'Communication', opts: ['Direct', 'Expressive', 'Chill', 'Poetic'] },
  { id: 'archetype', label: 'Fantasy Archetype', opts: ['Best friend', 'Older sibling', 'Mentor', 'Romantic interest', 'Chaos agent'] },
  { id: 'interest', label: 'Interest Leaning', opts: ['Creative', 'Technical', 'Physical', 'Intellectual', 'Fashion/Style'] },
];
