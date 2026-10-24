/**
 * Seed Question Bank for Saanjh
 * 13 Categories, each with 4 benchmark questions tagged with ML dimensions and stable value codes,
 * plus the standard Question 5 (shared_activity).
 */

const fixedQuestion5 = {
  questionIndex: 4,
  dimension: 'shared_activity',
  text: 'How much do you want a partner to share this interest?',
  options: [
    { label: 'Must have', value: 'must_have' },
    { label: 'Nice to have', value: 'nice_to_have' },
    { label: "Doesn't matter", value: 'doesnt_matter' },
  ],
  isSensitive: false,
  skippable: false,
};

const defaultBankQuestions = {
  music: [
    {
      questionIndex: 0,
      dimension: 'frequency',
      text: 'How often is music part of your daily rhythm?',
      options: [
        { label: 'Occasionally when traveling', value: '1' },
        { label: 'A few times a week', value: '2' },
        { label: 'Every day as background ambience', value: '3' },
        { label: 'Always playing, practically 24/7', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'social_preference',
      text: 'How do you prefer experiencing music?',
      options: [
        { label: 'Personal solo listening with headphones', value: 'solo' },
        { label: 'Shared listening with close friends or partner', value: 'intimate' },
        { label: 'Live concerts, gigs, and festivals', value: 'crowd' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'openness_to_new',
      text: 'When it comes to musical exploration, where do you sit?',
      options: [
        { label: 'I stick to familiar comfort tracks and nostalgia', value: 'familiar' },
        { label: 'I enjoy curated playlists and popular recommendations', value: 'curated' },
        { label: 'Constantly hunting for obscure artists and new genres', value: 'adventurous' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'intensity',
      text: 'How deeply do you engage with music?',
      options: [
        { label: 'Casual mood booster', value: '1' },
        { label: 'Appreciate lyrics and melody deeply', value: '2' },
        { label: 'Music enthusiast with curated vinyl/playlists', value: '3' },
        { label: 'I play, sing, or produce music myself', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  movies_tv: [
    {
      questionIndex: 0,
      dimension: 'frequency',
      text: 'How often do you watch movies or series?',
      options: [
        { label: 'Rarely, only on special occasions', value: '1' },
        { label: 'A movie or few episodes on weekends', value: '2' },
        { label: 'Several evenings during the week', value: '3' },
        { label: 'Daily enthusiast / regular binge watcher', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'style_preference',
      text: 'What viewing setting feels most comfortable to you?',
      options: [
        { label: 'Cozy living room sofa with blankets and snacks', value: 'home_cozy' },
        { label: 'The big screen cinema experience with theatre popcorn', value: 'cinema' },
        { label: 'Balanced mix depending on the title', value: 'balanced' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'social_preference',
      text: 'Do you prefer watching together or solo?',
      options: [
        { label: 'Mostly solo so I can pause and absorb at my pace', value: 'solo' },
        { label: 'Watching together with someone to discuss afterwards', value: 'shared' },
        { label: 'Lively group watch parties and laughs', value: 'group' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'depth',
      text: 'What kind of narratives pull you in most?',
      options: [
        { label: 'Light-hearted entertainment and comfort comedy', value: '1' },
        { label: 'Gripping thrillers and compelling plots', value: '2' },
        { label: 'Thought-provoking cinema and complex themes', value: '3' },
        { label: 'Art-house, cinematography, and deep analysis', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  books_learning: [
    {
      questionIndex: 0,
      dimension: 'frequency',
      text: 'How often do you set aside time to read or learn?',
      options: [
        { label: 'Occasionally when I get a block of free time', value: '1' },
        { label: 'A couple of times each month', value: '2' },
        { label: 'A regular weekly ritual', value: '3' },
        { label: 'Daily bedtime or morning reading habit', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'style_preference',
      text: 'What is your preferred format for absorbing ideas?',
      options: [
        { label: 'Physical paper books with margin notes', value: 'physical_books' },
        { label: 'Kindle, e-readers, or digital tablets', value: 'ebooks' },
        { label: 'Audiobooks and immersive podcasts on the go', value: 'audio' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'social_preference',
      text: 'How do you like sharing what you read?',
      options: [
        { label: 'It is a quiet, personal sanctuary', value: 'private' },
        { label: 'I love discussing key ideas and takeaways with a partner', value: 'partner_discussion' },
        { label: 'Active in book clubs or online intellectual communities', value: 'community' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'depth',
      text: 'What category of reading attracts you most?',
      options: [
        { label: 'Immersive fiction, fantasies, and gripping stories', value: '1' },
        { label: 'Self-improvement, psychology, and productivity', value: '2' },
        { label: 'Biographies, history, and real-world memoirs', value: '3' },
        { label: 'Philosophy, science, and foundational ideas', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  sports_fitness: [
    {
      questionIndex: 0,
      dimension: 'frequency',
      text: 'How active is your weekly fitness routine?',
      options: [
        { label: 'Gentle walks and light movement once or twice a week', value: '1' },
        { label: 'Moderate activity 2 to 3 days a week', value: '2' },
        { label: 'Dedicated workout schedule 4 to 5 days a week', value: '3' },
        { label: 'Intense daily training / athlete mindset', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'style_preference',
      text: 'What type of physical activity energizes you most?',
      options: [
        { label: 'Gym lifting, HIIT, or strength workouts', value: 'strength' },
        { label: 'Mindful yoga, pilates, or swimming', value: 'mindful' },
        { label: 'Competitive outdoor sports (cricket, tennis, badminton)', value: 'sports' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'social_preference',
      text: 'Do you prefer exercising solo or with others?',
      options: [
        { label: 'Solo in the zone with my own music', value: 'solo' },
        { label: 'Working out with a partner for accountability and fun', value: 'partner' },
        { label: 'Team sports and group classes with social energy', value: 'group' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'intensity',
      text: 'How do you approach sports and fitness goals?',
      options: [
        { label: 'Purely for mental well-being and destressing', value: '1' },
        { label: 'Consistent routine for general physical health', value: '2' },
        { label: 'Goal-driven with progressive milestones', value: '3' },
        { label: 'Passionate lifestyle central to my daily choices', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  outdoor_adventure: [
    {
      questionIndex: 0,
      dimension: 'frequency',
      text: 'How often do you venture into nature or outdoor trails?',
      options: [
        { label: 'Once or twice a year for a long vacation', value: '1' },
        { label: 'Occasional weekend day-trips every couple of months', value: '2' },
        { label: 'Monthly nature escapes or hikes', value: '3' },
        { label: 'Almost every weekend outside in green spaces', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'style_preference',
      text: 'What outdoor setting brings you the greatest peace?',
      options: [
        { label: 'Quiet mountain peaks and foggy forest trails', value: 'mountains' },
        { label: 'Sunny beaches, coastal drives, and ocean breeze', value: 'beaches' },
        { label: 'Campgrounds under starlit skies by a bonfire', value: 'camping' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'intensity',
      text: 'What is your comfort level with outdoor adventure?',
      options: [
        { label: 'Relaxed scenic walks and scenic viewpoints', value: '1' },
        { label: 'Comfortable day hikes with a marked trail', value: '2' },
        { label: 'Challenging treks, rafting, or camping overnight', value: '3' },
        { label: 'High-adrenaline expeditions and remote wilderness', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'social_preference',
      text: 'Who do you love sharing outdoor adventures with?',
      options: [
        { label: 'Quiet introspective solo wanders', value: 'solo' },
        { label: 'Hand-in-hand with a significant other', value: 'partner' },
        { label: 'A vibrant group of friends sharing laughs', value: 'friends' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  food_drink: [
    {
      questionIndex: 0,
      dimension: 'style_preference',
      text: 'What is your food exploration philosophy?',
      options: [
        { label: 'Comfort food and familiar cherished flavors', value: 'comfort' },
        { label: 'Excited to try new cuisines and hidden gem cafés', value: 'explorer' },
        { label: 'Cooking from scratch and experimenting at home', value: 'home_cook' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'frequency',
      text: 'How often do you dine out or explore new eateries?',
      options: [
        { label: 'A special treat once or twice a month', value: '1' },
        { label: 'Weekly weekend dinner or Sunday brunch', value: '2' },
        { label: 'Multiple times a week trying new spots', value: '3' },
        { label: 'Food is central to my daily social life', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'social_preference',
      text: 'What makes a culinary experience memorable for you?',
      options: [
        { label: 'Cozy home-cooked meals together in the kitchen', value: 'home_cozy' },
        { label: 'Quiet, candlelit ambient dinners for deep conversation', value: 'romantic' },
        { label: 'Bustling food street markets and vibrant group tables', value: 'social_vibrant' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'openness_to_new',
      text: 'How adventurous are your taste buds?',
      options: [
        { label: 'I know what I love and stick to my favorites', value: 'selective' },
        { label: 'Open to tasting if someone recommends a dish', value: 'open' },
        { label: 'First in line to try exotic recipes and spices', value: 'very_adventurous' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  creative: [
    {
      questionIndex: 0,
      dimension: 'frequency',
      text: 'How often do you engage in creative outlets or making?',
      options: [
        { label: 'Whenever sudden inspiration strikes', value: '1' },
        { label: 'A few dedicated hours on weekends', value: '2' },
        { label: 'Multiple times a week as an essential release', value: '3' },
        { label: 'Daily practice, craft, or profession', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'style_preference',
      text: 'What creative medium feels most natural to you?',
      options: [
        { label: 'Visual arts (photography, painting, sketching, design)', value: 'visual' },
        { label: 'Written words (journaling, poetry, storytelling)', value: 'writing' },
        { label: 'Hands-on tangible crafts (pottery, DIY, sewing, cooking)', value: 'hands_on' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'social_preference',
      text: 'How do you prefer sharing your creative pursuits?',
      options: [
        { label: 'Kept private as a sacred personal sanctuary', value: 'private' },
        { label: 'Sharing intimately with someone I deeply trust', value: 'partner' },
        { label: 'Showcasing to the world, galleries, or online', value: 'public' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'intensity',
      text: 'What does your creativity represent for you?',
      options: [
        { label: 'Fun relaxation and mindful downtime', value: '1' },
        { label: 'A meaningful way to process thoughts and emotions', value: '2' },
        { label: 'A core part of my identity and personal signature', value: '3' },
        { label: 'A serious artistic craft or career dedication', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  social_leisure: [
    {
      questionIndex: 0,
      dimension: 'social_preference',
      text: 'What kind of social environment leaves you feeling energized?',
      options: [
        { label: 'One-on-one deep conversations in quiet nooks', value: 'one_on_one' },
        { label: 'Small tight-knit circles of trusted friends', value: 'small_circle' },
        { label: 'Vibrant gatherings, parties, and festive celebrations', value: 'large_party' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'frequency',
      text: 'How often do you like planning social outings?',
      options: [
        { label: 'Once every couple of weeks; I cherish downtime', value: '1' },
        { label: 'One planned weekend hangout per week', value: '2' },
        { label: 'Two to three social engagements each week', value: '3' },
        { label: 'Always out and about with people', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'style_preference',
      text: 'What is your ideal Saturday evening plan?',
      options: [
        { label: 'Board games, pizza, and laughter with close friends', value: 'board_games' },
        { label: 'Live comedy club, theatre show, or live gig', value: 'live_show' },
        { label: 'Quiet home evening with tea and a thoughtful movie', value: 'quiet_home' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'openness_to_new',
      text: 'When invited to try an unfamiliar social experience:',
      options: [
        { label: 'I usually prefer my established comfort zones', value: 'hesitant' },
        { label: 'I am excited if someone I know is going with me', value: 'with_friend' },
        { label: 'I jump in enthusiastically; love the novelty', value: 'enthusiastic' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  travel: [
    {
      questionIndex: 0,
      dimension: 'frequency',
      text: 'How frequently do you like taking getaways or trips?',
      options: [
        { label: 'One major annual holiday', value: '1' },
        { label: 'A couple of short weekend breaks per year', value: '2' },
        { label: 'Every 2-3 months whenever long weekends line up', value: '3' },
        { label: 'Constantly on the move / digital nomad spirit', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'style_preference',
      text: 'What travel pacing feels most rewarding to you?',
      options: [
        { label: 'Slow travel: staying put, blending in with locals', value: 'slow_immersive' },
        { label: 'Curated itinerary: seeing the key sights without rushing', value: 'curated' },
        { label: 'Spontaneous and freeform: deciding on arrival', value: 'spontaneous' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'intensity',
      text: 'What style of accommodation and comfort fits you best?',
      options: [
        { label: 'Backpacker hostels and budget authenticity', value: '1' },
        { label: 'Charming boutique stays and cozy heritage homestays', value: '2' },
        { label: 'Comfortable 4-star hotels with reliable amenities', value: '3' },
        { label: 'Luxury resorts with spa and premium comfort', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'social_preference',
      text: 'Who is your ideal travel companion style?',
      options: [
        { label: 'Independent solo traveler with time to reflect', value: 'solo' },
        { label: 'A partner to share intimate sunsets and discoveries', value: 'partner' },
        { label: 'A lively group of friends making spontaneous memories', value: 'friends' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  lifestyle_wellness: [
    {
      questionIndex: 0,
      dimension: 'frequency',
      text: 'How frequently do you practice mindfulness or wellness routines?',
      options: [
        { label: 'Only when feeling overwhelmed or stressed', value: '1' },
        { label: 'A few deliberate moments each week', value: '2' },
        { label: 'Daily structured habit (meditation, journaling, walk)', value: '3' },
        { label: 'Wellness guides every decision throughout my day', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'style_preference',
      text: 'What is your daily rhythm style?',
      options: [
        { label: 'Early bird: mornings are my sacred quiet time', value: 'morning_person' },
        { label: 'Night owl: creative and reflective late hours', value: 'night_owl' },
        { label: 'Flexible / adapting to whatever the day demands', value: 'flexible' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'social_preference',
      text: 'How do you like rejuvenating after a demanding week?',
      options: [
        { label: 'Solitary quiet time at home with books and peace', value: 'solitary' },
        { label: 'A calm evening with a partner chatting over tea', value: 'partner_tea' },
        { label: 'Gentle outdoor walks or visiting a wellness studio', value: 'studio_nature' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'intensity',
      text: 'How intentional are your lifestyle and wellness choices?',
      options: [
        { label: 'Relaxed and easy-going with minimal rules', value: '1' },
        { label: 'Mindful about sleep and balanced nutrition', value: '2' },
        { label: 'Dedicated self-care practices and personal growth', value: '3' },
        { label: 'Holistic lifestyle focused on sustainability and well-being', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  intellectual: [
    {
      questionIndex: 0,
      dimension: 'frequency',
      text: 'How often do you dive into deep intellectual topics or current ideas?',
      options: [
        { label: 'Occasionally when a fascinating article pops up', value: '1' },
        { label: 'Regular weekly podcasts or discussion videos', value: '2' },
        { label: 'Daily curiosity following science, tech, or politics', value: '3' },
        { label: 'Constantly analyzing systems, ideas, and debates', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'social_preference',
      text: 'In conversations with a partner, what discussion style do you appreciate?',
      options: [
        { label: 'Light-hearted banter and playful everyday stories', value: 'playful' },
        { label: 'Thoughtful dialogues where we explore why things are', value: 'dialogue' },
        { label: 'Passionate intellectual sparring and debate', value: 'debate' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'depth',
      text: 'What domain of intellectual exploration excites you most?',
      options: [
        { label: 'Human psychology and interpersonal dynamics', value: '1' },
        { label: 'Technology, startups, and innovation', value: '2' },
        { label: 'Economics, history, and global affairs', value: '3' },
        { label: 'Philosophy, ethics, and fundamental questions', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'openness_to_new',
      text: 'When presented with a perspective that challenges your view:',
      options: [
        { label: 'I prefer to hold firmly to my core convictions', value: 'firm' },
        { label: 'Curious to understand where their view came from', value: 'curious' },
        { label: 'Eager to question my assumptions and learn new angles', value: 'receptive' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],

  culture: [
    {
      questionIndex: 0,
      dimension: 'intensity',
      text: 'How important are cultural traditions and festivals in your life?',
      options: [
        { label: 'Minimal; I prefer a secular, modern lifestyle', value: '1' },
        { label: 'Enjoy celebrating key holidays and festive moments', value: '2' },
        { label: 'Valued part of family connection and heritage', value: '3' },
        { label: 'Central to my daily grounding and identity', value: '4' },
        { label: 'Prefer not to say', value: 'prefer_not_to_say' },
      ],
      isSensitive: true,
      skippable: true,
    },
    {
      questionIndex: 1,
      dimension: 'style_preference',
      text: 'How do you celebrate cultural and festive occasions?',
      options: [
        { label: 'Quiet reflections or personal rituals', value: 'quiet' },
        { label: 'Festive cooking and celebrations with family', value: 'family' },
        { label: 'Community gatherings, music, and traditions', value: 'community' },
        { label: 'Prefer not to say', value: 'prefer_not_to_say' },
      ],
      isSensitive: true,
      skippable: true,
    },
    {
      questionIndex: 2,
      dimension: 'openness_to_new',
      text: 'How do you feel about experiencing a partner with different cultural roots?',
      options: [
        { label: 'Prefer similar cultural backgrounds for familiarity', value: 'similar' },
        { label: 'Open and respectful of diverse traditions', value: 'open' },
        { label: 'Enthusiastic about blending two rich cultures together', value: 'blended' },
        { label: 'Prefer not to say', value: 'prefer_not_to_say' },
      ],
      isSensitive: true,
      skippable: true,
    },
    {
      questionIndex: 3,
      dimension: 'social_preference',
      text: 'What role does spiritual or philosophical exploration play for you?',
      options: [
        { label: 'Practical rationalist / not particularly spiritual', value: 'rational' },
        { label: 'Spiritual in my own personal way without strict dogma', value: 'personal' },
        { label: 'Deeply grounded in ongoing spiritual inquiry', value: 'grounded' },
        { label: 'Prefer not to say', value: 'prefer_not_to_say' },
      ],
      isSensitive: true,
      skippable: true,
    },
  ],

  digital: [
    {
      questionIndex: 0,
      dimension: 'frequency',
      text: 'How often do you engage in gaming or digital entertainment?',
      options: [
        { label: 'Occasionally a casual mobile game or quick video', value: '1' },
        { label: 'A few hours on weekends for unwind time', value: '2' },
        { label: 'Several weeknights enjoying series, streams, or games', value: '3' },
        { label: 'Daily hobby and primary entertainment choice', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 1,
      dimension: 'style_preference',
      text: 'What digital entertainment platform feels most like home?',
      options: [
        { label: 'PC or console gaming with rich storytelling', value: 'pc_console' },
        { label: 'YouTube essays, tech breakdowns, and podcasts', value: 'youtube_tech' },
        { label: 'Casual mobile gaming and social streams', value: 'mobile_casual' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 2,
      dimension: 'social_preference',
      text: 'Do you prefer single-player immersion or multiplayer fun?',
      options: [
        { label: 'Single-player narrative immersion in my own world', value: 'single_player' },
        { label: 'Co-op gaming together with a partner or close friend', value: 'co_op' },
        { label: 'Online competitive multiplayer with teams and voice chat', value: 'multiplayer' },
      ],
      isSensitive: false,
      skippable: false,
    },
    {
      questionIndex: 3,
      dimension: 'intensity',
      text: 'How does digital entertainment balance with your offline life?',
      options: [
        { label: 'Quick casual break between real-world activities', value: '1' },
        { label: 'Enjoyable evening relaxation ritual', value: '2' },
        { label: 'Passionate hobby with dedicated setup and gear', value: '3' },
        { label: 'Major community and creative space in my life', value: '4' },
      ],
      isSensitive: false,
      skippable: false,
    },
  ],
};

module.exports = {
  fixedQuestion5,
  defaultBankQuestions,
};
