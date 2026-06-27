export const STEPS = [
  'name', 'dob', 'ageGroup', 'vibe', 'communication', 'occupation',
  'relationship', 'loveLang', 'needs', 'socialId', 'activities',
  'activitySubs', 'cuisineLove', 'cuisineDislike', 'dietary', 'favMovies', 'favMusic',
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
