/*
 * =====================================================================
 *   ❤️  LOVE QUEST — PERSONALIZE YOUR GAME HERE  ❤️
 * =====================================================================
 *   Everything personal lives in this one file: names, love notes,
 *   memory cards, quiz questions, the secret letter and the coupons
 *   of the Love-o-Matic. Edit freely: every value is validated when
 *   the game starts, and anything invalid falls back to a sensible
 *   default (with a hint in the browser console).
 * =====================================================================
 */
var LOVE_CONFIG = {
  /* Default interface language: 'en' (English) or 'de' (Deutsch).
     Players can switch it any time in the settings. */
  language: 'en',

  /* The person playing the game. Shown in the story, on the map and in
     the final question (players can change it on the hero screen). */
  heroName: 'Valentine',

  /* You: the one waiting at the end of the labyrinth. Signs the letter. */
  belovedName: 'your Valentine',

  /* The pixel avatar that represents YOU at the end of the labyrinth:
     0 = Rose (long hair, green dress)   1 = Wanderer (hooded cloak)
     2 = Sunny (short hair)              3 = Royal (little crown)   */
  belovedAvatar: 1,

  /* Trial 1 · Catch the Love: the notes hidden in the five love letters. */
  loveQuotes: [
    'You make me smile!',
    'My heart beats for adventure, with you!',
    'When you are here, everything is fine.',
    'I think of you every single day.',
    'Level up with you!'
  ],

  /* Trial 2 · Memories: six card motifs. Use emojis or image paths,
     e.g. 'assets/photos/us-1.jpg' (square photos look best). */
  memoryItems: ['🌹', '🍫', '🧸', '💍', '🍕', '🐱'],

  /* Trial 4 · Love Quiz. "correct" is the position of the right answer,
     counting from 0 (0 = first answer). "wrongMsg" appears on a miss. */
  quiz: [
    {
      question: 'What do I like more about you?',
      answers: ['Eyes', 'Your Mommy', 'Boobies'],
      correct: 2,
      wrongMsg: 'WROOOOONG'
    },
    {
      question: 'Where was I born?',
      answers: ['Moon', 'Nowhere', 'Somewhere'],
      correct: 1,
      wrongMsg: 'OFC!'
    },
    {
      question: 'Who is better?',
      answers: ['I am', 'You', 'Both'],
      correct: 0,
      wrongMsg: 'NA THATS BAD!'
    }
  ],

  /* The Final Question, asked at the end of the quest. */
  proposalQuestion: 'Will you be my Valentine?',

  /* The secret letter. It is torn into five pieces that are found along
     the journey and is revealed completely after the final question. */
  finalLetter: "You're the love of my life!",

  /* Coupons inside the Love-o-Matic. Tokens for a spin are earned with
     stars and achievements. Each coupon can be won once. */
  coupons: [
    { icon: '🍳', title: 'Breakfast in bed' },
    { icon: '💆', title: 'A cozy massage' },
    { icon: '🎬', title: 'Movie night, you pick the film' },
    { icon: '🍝', title: 'A homemade dinner' },
    { icon: '🌅', title: 'A sunset walk together' },
    { icon: '🤗', title: 'Unlimited cuddles for a day' },
    { icon: '🍦', title: 'An ice cream date' },
    { icon: '🎮', title: 'Game night (and I let you win)' }
  ],

  /* The very special reward for saying YES. */
  finalCoupon: { icon: '💝', title: 'A Valentine’s date of your choice' }
};
