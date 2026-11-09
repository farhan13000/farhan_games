/** Question banks for the social games. Ids are array indexes and must stay stable. */

export interface QuizQuestion {
  text: string;
  options: string[];
}

/** "How Well Do You Know Me?" — answered by the spotlight player about themselves. */
export const KNOW_ME_QUESTIONS: QuizQuestion[] = [
  {
    text: 'Perfect weekend?',
    options: ['Cosy at home', 'Out exploring', 'Big night out', 'Spontaneous road trip'],
  },
  {
    text: 'Go-to comfort food?',
    options: ['Pizza', 'Something sweet', 'A home-cooked meal', 'Spicy takeaway'],
  },
  {
    text: 'Morning person or night owl?',
    options: ['Up with the sun', 'Night owl for life', 'Depends on the day'],
  },
  {
    text: 'Dream holiday?',
    options: ['Beach and sunshine', 'Snowy mountains', 'Buzzing big city', 'Remote wilderness'],
  },
  {
    text: 'How do you recharge?',
    options: ['Alone time', 'With friends', 'Exercise', 'Sleep, lots of it'],
  },
  { text: 'Favourite season?', options: ['Spring', 'Summer', 'Autumn', 'Winter'] },
  {
    text: 'Pick a superpower',
    options: ['Teleportation', 'Invisibility', 'Reading minds', 'Flying'],
  },
  {
    text: 'Most likely to be late because of…',
    options: ['Oversleeping', 'Choosing an outfit', 'Getting distracted', 'I am never late'],
  },
  { text: 'Ideal movie night?', options: ['Comedy', 'Horror', 'Romance', 'Action'] },
  {
    text: 'Coffee order vibe?',
    options: ['Black coffee', 'Sweet and fancy', 'Tea please', 'No caffeine'],
  },
  {
    text: 'Biggest pet peeve?',
    options: ['Loud chewing', 'Lateness', 'Messy spaces', 'Slow walkers'],
  },
  {
    text: 'Love language?',
    options: ['Words of affirmation', 'Quality time', 'Gifts', 'Acts of service', 'Physical touch'],
  },
  {
    text: 'At a party you are…',
    options: ['On the dance floor', 'Deep in one conversation', 'Near the snacks', 'Leaving early'],
  },
  { text: 'Dream pet?', options: ['Dog', 'Cat', 'Something exotic', 'No pets'] },
  {
    text: 'How do you handle stress?',
    options: ['Talk it out', 'Go quiet', 'Keep busy', 'Snack it away'],
  },
  { text: 'Pick a dessert', options: ['Chocolate cake', 'Ice cream', 'Cheesecake', 'Fruit'] },
  {
    text: 'Favourite way to celebrate?',
    options: ['Fancy dinner', 'House party', 'Quiet night in', 'An adventure'],
  },
  {
    text: 'Which would you rather give up?',
    options: ['Social media', 'Coffee', 'Music', 'Takeaway'],
  },
  {
    text: 'Your phone is mostly used for…',
    options: ['Messaging', 'Social media', 'Games', 'Videos and music'],
  },
  {
    text: 'Dream job as a kid?',
    options: ['Astronaut', 'Doctor or vet', 'Famous star', 'Teacher', 'Something wild'],
  },
  { text: 'Hidden talent vibe?', options: ['Cooking', 'Singing', 'Drawing', 'Sports'] },
  {
    text: 'First thing you notice about people?',
    options: ['Smile', 'Eyes', 'Style', 'Sense of humour'],
  },
  { text: 'Pick a pizza topping', options: ['Pepperoni', 'Pineapple', 'Mushrooms', 'Just cheese'] },
  {
    text: 'Texting style?',
    options: ['Instant replies', 'Voice notes', 'Emoji everywhere', 'Replies days later'],
  },
  {
    text: 'Favourite weather?',
    options: ['Sunny and hot', 'Rainy and cosy', 'Crisp and cold', 'Stormy'],
  },
  {
    text: 'You would rather live…',
    options: ['In the city', 'By the sea', 'In the countryside', 'In the mountains'],
  },
  {
    text: 'Secret guilty pleasure?',
    options: ['Reality TV', 'Junk food', 'Online shopping', 'Sleeping in'],
  },
  { text: 'Pick a decade to live in', options: ['The 70s', 'The 80s', 'The 90s', 'The future'] },
  {
    text: 'How do you pick a restaurant?',
    options: [
      'Read every review',
      'Old favourite',
      'Whatever is closest',
      'Let someone else decide',
    ],
  },
  {
    text: 'Most treasured possession?',
    options: ['Phone', 'Something sentimental', 'Comfy clothes', 'My bed'],
  },
];

/** "In Sync" — this-or-that prompts both players answer for themselves. */
export const IN_SYNC_QUESTIONS: QuizQuestion[] = [
  { text: 'Dream getaway', options: ['Beach', 'Mountains'] },
  { text: 'Movie night snack', options: ['Popcorn', 'Chocolate'] },
  { text: 'Pick one', options: ['Cats', 'Dogs'] },
  { text: 'Sunday plans', options: ['Brunch out', 'Pyjama day'] },
  { text: 'Drink', options: ['Coffee', 'Tea'] },
  { text: 'Weather', options: ['Summer heat', 'Winter snow'] },
  { text: 'Trip style', options: ['Planned to the minute', 'Totally spontaneous'] },
  { text: 'Pizza', options: ['Thin crust', 'Deep dish'] },
  { text: 'Night in', options: ['Board games', 'Movie marathon'] },
  { text: 'Music', options: ['Blasting loud', 'Soft background'] },
  { text: 'Pick a power', options: ['Fly', 'Teleport'] },
  { text: 'Breakfast', options: ['Sweet', 'Savoury'] },
  { text: 'Holiday', options: ['City break', 'Nature retreat'] },
  { text: 'Getting around', options: ['Road trip', 'Train journey'] },
  { text: 'Fun', options: ['Theme park', 'Museum'] },
  { text: 'Sleep', options: ['Early bird', 'Night owl'] },
  { text: 'Dinner date', options: ['Fancy restaurant', 'Street food'] },
  { text: 'Books', options: ['Paper', 'E-reader'] },
  { text: 'Exercise', options: ['Gym', 'Long walk'] },
  { text: 'Dessert', options: ['Ice cream', 'Cake'] },
  { text: 'Living', options: ['Big city', 'Small town'] },
  { text: 'Stories', options: ['Fantasy', 'True crime'] },
  { text: 'Texts', options: ['Call me', 'Text me'] },
  { text: 'Fries', options: ['Ketchup', 'Mayo'] },
  { text: 'Time travel to', options: ['The past', 'The future'] },
  { text: 'Season', options: ['Spring', 'Autumn'] },
  { text: 'Party', options: ['Small dinner', 'Huge bash'] },
  { text: 'Adventure', options: ['Skydiving', 'Scuba diving'] },
  { text: 'Gift', options: ['Surprise', 'Something I asked for'] },
  { text: 'Weekend', options: ['Out and about', 'Recharge at home'] },
  { text: 'Chocolate', options: ['Dark', 'Milk'] },
  { text: 'Phone', options: ['Always on loud', 'Always on silent'] },
];

export const QUIZ_QUESTIONS_PER_ROUND = 10;

export const RPS_CHOICES = [
  { label: 'Rock', emoji: '✊' },
  { label: 'Paper', emoji: '✋' },
  { label: 'Scissors', emoji: '✌️' },
] as const;

export const MEMORY_FACES = [
  '🐶',
  '🐱',
  '🦊',
  '🐼',
  '🐸',
  '🦄',
  '🐙',
  '🦋',
  '🌻',
  '🍓',
  '🍩',
  '🎈',
] as const;
