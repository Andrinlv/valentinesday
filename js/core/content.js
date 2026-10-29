/* Love Quest · validates js/config.js and fills every gap with safe defaults. */
(function (LQ) {
  'use strict';

  const MEMORY_PAIRS = 6;
  const AVATAR_COUNT = 4;
  const IMAGE_PATTERN = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i;

  const DEFAULTS = Object.freeze({
    language: 'en',
    heroName: 'Valentine',
    belovedName: 'your Valentine',
    belovedAvatar: 1,
    loveQuotes: [
      'You make me smile!',
      'My heart beats for adventure, with you!',
      'When you are here, everything is fine.',
      'I think of you every single day.',
      'Level up with you!'
    ],
    memoryPool: ['🌹', '🍫', '🧸', '💍', '🍕', '🐱', '🌻', '🎵', '☕', '🌙', '🍓', '🎈'],
    quiz: [
      { question: 'Who loves you the most?', answers: ['Me', 'Also me', 'Definitely me'], correct: 2, wrongMsg: 'Close… but think bigger!' }
    ],
    proposalQuestion: 'Will you be my Valentine?',
    finalLetter: 'You are the love of my life!',
    coupons: [
      { icon: '🍳', title: 'Breakfast in bed' },
      { icon: '🎬', title: 'Movie night, you pick the film' },
      { icon: '🤗', title: 'Unlimited cuddles for a day' }
    ],
    finalCoupon: { icon: '💝', title: 'A Valentine’s date of your choice' }
  });

  function warn(message) {
    console.warn(`[LoveQuest] config: ${message}`);
  }

  function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  }

  function textOr(value, fallback, maxLength, field) {
    const text = cleanText(value, maxLength);
    if (text) return text;
    if (value !== undefined) warn(`"${field}" must be a non-empty text, using the default.`);
    return fallback;
  }

  function validateQuotes(list) {
    const quotes = Array.isArray(list) ? list.map((quote) => cleanText(quote, 160)).filter(Boolean) : [];
    if (quotes.length) return quotes;
    if (list !== undefined) warn('"loveQuotes" needs at least one text, using the defaults.');
    return DEFAULTS.loveQuotes.slice();
  }

  function validateMemory(list) {
    const items = [];
    (Array.isArray(list) ? list : []).forEach((entry) => {
      const value = cleanText(entry, 300);
      if (!value) return;
      if (items.includes(value)) {
        warn(`memory item "${value}" is listed twice; duplicates are ignored.`);
        return;
      }
      items.push(value);
    });
    if (items.length < MEMORY_PAIRS) {
      if (list !== undefined) warn(`"memoryItems" needs ${MEMORY_PAIRS} different entries, the missing ones were filled in.`);
      for (const fallback of DEFAULTS.memoryPool) {
        if (items.length >= MEMORY_PAIRS) break;
        if (!items.includes(fallback)) items.push(fallback);
      }
    }
    return items.slice(0, MEMORY_PAIRS).map((value) => ({ value, isImage: IMAGE_PATTERN.test(value) }));
  }

  function validateQuiz(list) {
    if (!Array.isArray(list)) {
      if (list !== undefined) warn('"quiz" must be a list of questions, using the default question.');
      return DEFAULTS.quiz.map((entry) => ({ ...entry, answers: entry.answers.slice() }));
    }
    const questions = [];
    list.forEach((entry, index) => {
      const source = entry && typeof entry === 'object' ? entry : {};
      const question = cleanText(source.question, 240);
      const rawAnswers = Array.isArray(source.answers) ? source.answers : [];
      const answers = rawAnswers.map((answer) => cleanText(answer, 90));
      const correct = source.correct;
      const valid = question &&
        answers.length >= 2 && answers.length <= 6 &&
        answers.every(Boolean) &&
        Number.isInteger(correct) && correct >= 0 && correct < answers.length;
      if (!valid) {
        warn(`quiz question #${index + 1} is incomplete (question, 2–6 answers and a valid "correct" index are required) and was skipped.`);
        return;
      }
      questions.push({ question, answers, correct, wrongMsg: cleanText(source.wrongMsg, 140) });
    });
    if (questions.length) return questions;
    warn('no valid quiz question found, using the default question.');
    return DEFAULTS.quiz.map((entry) => ({ ...entry, answers: entry.answers.slice() }));
  }

  function validateCoupon(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const title = cleanText(entry.title, 90);
    if (!title) return null;
    return { icon: cleanText(entry.icon, 16) || '🎟️', title };
  }

  function validateCoupons(list) {
    const coupons = Array.isArray(list) ? list.map(validateCoupon).filter(Boolean) : [];
    if (coupons.length) return coupons;
    if (list !== undefined) warn('"coupons" needs at least one coupon with a title, using the defaults.');
    return DEFAULTS.coupons.map((coupon) => ({ ...coupon }));
  }

  function validate(raw) {
    const config = raw && typeof raw === 'object' ? raw : {};
    if (!raw) warn('LOVE_CONFIG was not found, using the defaults.');

    let language = DEFAULTS.language;
    if (config.language === 'en' || config.language === 'de') language = config.language;
    else if (config.language !== undefined) warn('"language" must be "en" or "de".');

    let belovedAvatar = DEFAULTS.belovedAvatar;
    if (Number.isInteger(config.belovedAvatar) && config.belovedAvatar >= 0 && config.belovedAvatar < AVATAR_COUNT) {
      belovedAvatar = config.belovedAvatar;
    } else if (config.belovedAvatar !== undefined) {
      warn(`"belovedAvatar" must be a number from 0 to ${AVATAR_COUNT - 1}.`);
    }

    return Object.freeze({
      language,
      heroName: textOr(config.heroName, DEFAULTS.heroName, 16, 'heroName'),
      belovedName: textOr(config.belovedName, DEFAULTS.belovedName, 28, 'belovedName'),
      belovedAvatar,
      loveQuotes: validateQuotes(config.loveQuotes),
      memoryItems: validateMemory(config.memoryItems),
      quiz: validateQuiz(config.quiz),
      proposalQuestion: textOr(config.proposalQuestion, DEFAULTS.proposalQuestion, 120, 'proposalQuestion'),
      finalLetter: textOr(config.finalLetter, DEFAULTS.finalLetter, 4000, 'finalLetter'),
      coupons: validateCoupons(config.coupons),
      finalCoupon: validateCoupon(config.finalCoupon) || { ...DEFAULTS.finalCoupon }
    });
  }

  LQ.validateContent = validate;
  LQ.CONTENT_LIMITS = Object.freeze({ MEMORY_PAIRS, AVATAR_COUNT });
  LQ.content = validate(globalThis.LOVE_CONFIG);
})(globalThis.LQ = globalThis.LQ || {});
