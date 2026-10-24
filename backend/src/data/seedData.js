/**
 * Saanjh Interest Catalog (13 categories, 251 unique items) & Seeded Questions
 */

const catalogData = {
  music: {
    label: "Music",
    items: [
      "Pop", "Rock", "Alternative / indie", "Classical", "Jazz", "Blues",
      "Hip-hop / rap", "R&B / soul", "Electronic / EDM", "Country", "Folk",
      "Bollywood", "Indian classical", "Devotional", "Lo-fi", "Instrumental",
      "K-pop", "Latin music", "Live music", "Playing musical instruments",
      "Singing", "Music production"
    ]
  },
  movies_tv: {
    label: "Movies and TV",
    items: [
      "Action", "Comedy", "Romance", "Drama", "Thriller", "Mystery",
      "Horror", "Science fiction", "Fantasy", "Documentaries", "Anime",
      "Bollywood films", "Hollywood films", "Regional Indian cinema",
      "Web series", "Reality TV", "Stand-up comedy", "Animated films",
      "Superhero films", "Watching at home", "Going to the cinema"
    ]
  },
  books_learning: {
    label: "Books and Learning",
    items: [
      "Fiction", "Romance novels", "Mystery novels", "Fantasy novels",
      "Thrillers", "Biographies", "Self-help", "Psychology", "Philosophy",
      "History", "Science", "Technology", "Business", "Poetry",
      "Personal development", "Reading blogs", "Audiobooks", "Podcasts",
      "Online courses", "Learning new skills"
    ]
  },
  sports_fitness: {
    label: "Sports and Fitness",
    items: [
      "Cricket", "Football / soccer", "Basketball", "Tennis", "Badminton",
      "Volleyball", "Table tennis", "Swimming", "Running", "Cycling",
      "Gym workouts", "Yoga", "Pilates", "Hiking", "Trekking",
      "Rock climbing", "Martial arts", "Boxing", "Dancing", "Walking",
      "Watching live sports", "Esports", "Chess"
    ]
  },
  outdoor_adventure: {
    label: "Outdoor Activities and Adventure",
    items: [
      "Traveling", "Road trips", "Camping", "Backpacking", "Nature walks",
      "Birdwatching", "Wildlife", "Mountaineering", "Beach trips",
      "Water sports", "Fishing", "Gardening", "Photography walks",
      "Exploring new cities", "Stargazing", "Picnics", "Adventure sports",
      "Motorcycling", "Exploring local places"
    ]
  },
  food_drink: {
    label: "Food and Drink",
    items: [
      "Cooking", "Baking", "Trying new restaurants", "Street food",
      "Fine dining", "Vegetarian food", "Vegan food", "Indian cuisine",
      "Italian cuisine", "Chinese cuisine", "Japanese cuisine",
      "Korean cuisine", "Mexican cuisine", "Mediterranean cuisine",
      "Desserts", "Coffee", "Tea", "Specialty cafés", "Brunch",
      "Food festivals", "Home-cooked meals", "Trying new recipes"
    ]
  },
  creative: {
    label: "Creative Hobbies",
    items: [
      "Photography", "Painting", "Drawing", "Sketching", "Digital art",
      "Graphic design", "Writing", "Journaling", "Poetry writing",
      "Crafts", "Pottery", "DIY projects", "Interior design", "Fashion",
      "Sewing", "Calligraphy", "Video editing", "Filmmaking",
      "Content creation", "Web design", "Coding", "3D modeling"
    ]
  },
  social_leisure: {
    label: "Social and Leisure",
    items: [
      "Spending time with friends", "Family gatherings", "Board games",
      "Card games", "Trivia nights", "Escape rooms", "Karaoke", "Parties",
      "Concerts", "Festivals", "Museums", "Art galleries", "Theatre",
      "Volunteering", "Community events", "Hosting dinners",
      "Quiet evenings at home", "Game nights", "Trying new experiences"
    ]
  },
  travel: {
    label: "Travel Preferences",
    items: [
      "International travel", "Domestic travel", "Luxury travel",
      "Budget travel", "Solo travel", "Group travel", "Cultural tourism",
      "Historical places", "Nature destinations", "Beach holidays",
      "Mountain holidays", "City breaks", "Spontaneous trips",
      "Planned itineraries", "Weekend getaways", "Pilgrimages",
      "Food-focused travel", "Adventure travel"
    ]
  },
  lifestyle_wellness: {
    label: "Lifestyle and Wellness",
    items: [
      "Meditation", "Mindfulness", "Healthy eating", "Fitness routines",
      "Personal growth", "Minimalism", "Sustainable living",
      "Spiritual exploration", "Reading before bed", "Morning routines",
      "Self-care", "Home organization", "Pets", "Dog walking",
      "Cat care", "Houseplants", "Technology and gadgets", "Gaming",
      "Watching sports", "Relaxation", "Work-life balance"
    ]
  },
  intellectual: {
    label: "Intellectual Interests",
    items: [
      "Human behavior", "Space and astronomy", "Artificial intelligence",
      "Programming", "Entrepreneurship", "Startups", "Investing",
      "Economics", "Politics and current affairs", "World cultures",
      "Languages", "Mathematics", "Puzzles", "Strategy games",
      "Debates", "Innovation", "Research"
    ]
  },
  culture: {
    label: "Culture and Personal Expression",
    items: [
      "Fashion and style", "Architecture", "Design", "Cultural festivals",
      "Traditions", "Language exchange", "International cultures",
      "Religious or spiritual activities", "Live performances",
      "Classical arts", "Local heritage", "Social causes",
      "Environmental causes", "Community service"
    ]
  },
  digital: {
    label: "Digital Entertainment",
    items: [
      "PC gaming", "Console gaming", "Mobile gaming",
      "Online multiplayer games", "Simulation games", "Role-playing games",
      "Streaming", "YouTube", "Social media content", "Tech channels",
      "Gaming streams", "Virtual reality", "Online communities"
    ]
  }
};

/**
 * Seeded default questions for each category (2 questions each)
 * Formatted with text, options array, skippable, and isSensitive flag
 */
const defaultQuestionsData = {
  music: [
    {
      text: "How do you mostly enjoy music?",
      options: ["Listening", "Live shows", "Playing or singing", "Creating"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "What mood fits you most?",
      options: ["Energetic", "Relaxed", "Emotional", "Depends"],
      skippable: false,
      isSensitive: false
    }
  ],
  movies_tv: [
    {
      text: "Where do you prefer watching?",
      options: ["Cinema", "Home", "Both"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "How much do you watch?",
      options: ["Rarely", "Weekly", "Almost daily"],
      skippable: false,
      isSensitive: false
    }
  ],
  books_learning: [
    {
      text: "How do you prefer to read or learn?",
      options: ["Books", "Audio", "Podcasts", "Courses"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "How often?",
      options: ["Rarely", "Monthly", "Weekly", "Daily"],
      skippable: false,
      isSensitive: false
    }
  ],
  sports_fitness: [
    {
      text: "Do you play, watch, or both?",
      options: ["Play", "Watch", "Both"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "How active are you per week?",
      options: ["0-1", "2-3", "4+ days"],
      skippable: false,
      isSensitive: false
    }
  ],
  outdoor_adventure: [
    {
      text: "Favourite setting?",
      options: ["Mountains", "Beach", "Nature", "City"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "Comfort level?",
      options: ["Easy and relaxed", "Moderate", "Adventurous"],
      skippable: false,
      isSensitive: false
    }
  ],
  food_drink: [
    {
      text: "Any dietary preference?",
      options: ["Vegetarian", "Vegan", "Non-vegetarian", "No preference", "Prefer not to say"],
      skippable: true,
      isSensitive: true
    },
    {
      text: "Cook at home or eat out more?",
      options: ["Cook at home", "Eat out", "Both equally"],
      skippable: false,
      isSensitive: false
    }
  ],
  creative: [
    {
      text: "Do you create or appreciate?",
      options: ["Create regularly", "Occasionally", "Mostly appreciate"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "Do you share your work?",
      options: ["Publicly", "With friends", "Private"],
      skippable: false,
      isSensitive: false
    }
  ],
  social_leisure: [
    {
      text: "Preferred group size?",
      options: ["One-on-one", "Small group", "Big gatherings"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "Do you prefer hosting or attending?",
      options: ["Hosting", "Attending", "Either"],
      skippable: false,
      isSensitive: false
    }
  ],
  travel: [
    {
      text: "How often do you travel?",
      options: ["Rarely", "A few times a year", "Monthly"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "Trip style?",
      options: ["Planned", "Spontaneous", "Mix"],
      skippable: false,
      isSensitive: false
    }
  ],
  lifestyle_wellness: [
    {
      text: "Daily routine?",
      options: ["Early bird", "Night owl", "Flexible"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "How much is a healthy lifestyle a priority?",
      options: ["Low", "Medium", "High"],
      skippable: false,
      isSensitive: false
    }
  ],
  intellectual: [
    {
      text: "Which conversations do you enjoy?",
      options: ["Deep ideas", "Current affairs", "Light and fun", "Mix"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "In discussions, do you enjoy debate or prefer calm talk?",
      options: ["Debate", "Calm talk", "Depends"],
      skippable: false,
      isSensitive: false
    }
  ],
  culture: [
    {
      text: "How important are traditions and festivals?",
      options: ["Not", "Somewhat", "Very"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "Spiritual or religious practice?",
      options: ["None", "Occasional", "Regular", "Prefer not to say"],
      skippable: true,
      isSensitive: true
    }
  ],
  digital: [
    {
      text: "Hours per day on games, streaming or social content?",
      options: ["Under 1", "1-3", "3+"],
      skippable: false,
      isSensitive: false
    },
    {
      text: "Mostly solo, with others, or watching streams?",
      options: ["Solo", "With others", "Watching streams"],
      skippable: false,
      isSensitive: false
    }
  ]
};

function generateSlug(category, label) {
  const cleanCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cleanLabel = label
    .toLowerCase()
    .replace(/\s*\/\s*/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `${cleanCategory}.${cleanLabel}`;
}

module.exports = {
  catalogData,
  defaultQuestionsData,
  generateSlug,
};
