/* Love Quest · interface texts (English / Deutsch). Personal content lives in js/config.js. */
(function (LQ) {
  'use strict';

  const DICT = {
    en: {
      'app.title': 'Love Quest',

      'common.close': 'Close',
      'common.cancel': 'CANCEL',
      'common.continue': 'Continue',
      'common.go': 'GO!',
      'common.lp': 'LP',
      'common.on': 'ON',
      'common.off': 'OFF',

      'boot.loading': 'LOVE LOADING...',
      'boot.hint': 'Hold hands and hold on tight... are you ready?',
      'boot.ready': 'Ready? Press start!',
      'boot.start': 'PRESS START',
      'boot.cheat': '❤️ CHEAT CODE ACTIVATED ❤️',

      'select.title': 'CHOOSE YOUR HERO',
      'select.subtitle': 'Who will walk the path of love?',
      'select.nameLabel': 'Your name',
      'select.go': 'START QUEST',
      'avatar.rose': 'Rose',
      'avatar.wanderer': 'Wanderer',
      'avatar.sunny': 'Sunny',
      'avatar.royal': 'Royal',

      'intro.skip': 'Skip',
      'intro.lines': [
        'Once upon a time, a lonely traveler stood at the old ruins by the sea…',
        'Far across the water, behind golden towers, a heart was waiting.',
        'On the way there, a secret letter lay hidden, torn into six pieces.',
        'Only those who pass the five trials of love can find them all and reach the castle.',
        'Your journey begins now, {name}. Are you ready?'
      ],

      'map.title': 'LOVE QUEST',
      'map.letter': 'Letter',
      'map.gacha': 'Love-o-Matic',
      'map.trophies': 'Trophies',
      'map.settings': 'Settings',
      'map.locked': 'Finish the previous trial first! 🔒',
      'map.play': 'PLAY',
      'map.replay': 'PLAY AGAIN',
      'map.best': 'Best: {score} LP',
      'map.noBest': 'Not played yet',
      'map.goals': 'Goals',
      'map.trial': 'Trial {n}',
      'map.finale': 'Finale',
      'map.welcomeBack': 'Welcome back, {name}!',
      'map.loveLevel': 'Love Level {n}',
      'map.stats.lp': 'Love Points',
      'map.stats.stars': 'Stars',
      'map.stats.tokens': 'Tokens',

      'level.catch.title': 'Catch the Love',
      'level.catch.desc': 'Hearts are floating into the sky! Tap them to catch them, chain catches into combos and grab all five love letters. Careful with the broken hearts!',
      'level.catch.star1': 'Finish the round',
      'level.catch.star2': 'Score {n} LP',
      'level.catch.star3': 'Score {n} LP and catch all 5 letters',
      'level.memory.title': 'Memories',
      'level.memory.desc': 'Flip the polaroids and find all six pairs. The fewer moves, the better. Stuck? You may peek once.',
      'level.memory.star1': 'Find all pairs',
      'level.memory.star2': 'Moves ≤ {n}',
      'level.memory.star3': 'Moves ≤ {n}',
      'level.archery.title': 'Cupid’s Arrow',
      'level.archery.desc': 'Pull back, aim and release to shoot Cupid’s arrows at the floating hearts. One arrow can hit several hearts!',
      'level.archery.star1': 'Shoot all arrows',
      'level.archery.star2': 'Hit {n} hearts',
      'level.archery.star3': 'Hit {n} hearts',
      'level.quiz.title': 'Love Quiz',
      'level.quiz.desc': 'How well do you know us? Quick answers earn bonus points, and one joker removes a wrong answer.',
      'level.quiz.star1': 'Answer every question',
      'level.quiz.star2': 'Mistakes ≤ {n}',
      'level.quiz.star3': 'No mistakes',
      'level.maze.title': 'The Labyrinth',
      'level.maze.desc': 'Guide your hero through the rose garden labyrinth. Find the key on each of the three floors and open the gate. At night the Heartbreakers roam, so keep your distance!',
      'level.maze.star1': 'Escape the labyrinth',
      'level.maze.star2': 'Lose at most 1 heart',
      'level.maze.star3': 'No damage and beat the par time',
      'level.final.title': 'The Final Question',
      'level.final.desc': 'Someone is waiting at the castle with a very important question…',
      'level.final.goal': 'Answer from your heart',

      'hud.pause': 'Pause',
      'hud.score': 'Score',
      'hud.time': 'Time',
      'hud.combo': 'Combo',
      'hud.letters': 'Love letters',
      'hud.moves': 'Moves',
      'hud.pairs': 'Pairs',
      'hud.arrows': 'Arrows left',
      'hud.hits': 'Hits',
      'hud.question': 'Question',
      'hud.floor': 'Floor',
      'hud.lives': 'Hearts',
      'hud.collected': 'Collected hearts',
      'hud.key': 'Key',

      'catch.hint.touch': 'Tap the hearts!',
      'catch.hint.mouse': 'Click the hearts!',
      'catch.timeUp': 'TIME UP!',
      'catch.combo': 'COMBO x{n}!',
      'catch.letter': 'Love letter {n}/5',

      'memory.peek': 'Peek',
      'memory.peekUsed': 'Peeked',
      'memory.cardHidden': 'Hidden card {n}',
      'memory.cardShown': 'Card {n}: {item}',
      'memory.photo': 'photo',
      'memory.match': 'MATCH!',
      'memory.allFound': 'ALL PAIRS FOUND!',

      'archery.hint.touch': 'Pull back and release to shoot!',
      'archery.hint.mouse': 'Drag back and release, or use ← → ↑ ↓ and Space',
      'archery.aria': 'Archery field. Drag back from anywhere and release to shoot.',
      'archery.multi': 'MULTI HIT x{n}!',
      'archery.perfect': 'PERFECT AIM!',
      'archery.outOfArrows': 'OUT OF ARROWS!',

      'quiz.progress': 'Question {n}/{total}',
      'quiz.correct': 'Correct! ❤️',
      'quiz.wrongDefault': 'Nope! Try again 💔',
      'quiz.joker': '50:50 Joker',
      'quiz.jokerUsed': 'Joker used',
      'quiz.bonus': 'Speed bonus',

      'maze.floor': 'Floor {n}/{total}',
      'maze.floorName.1': 'The Rose Garden',
      'maze.floorName.2': 'Twilight Hedges',
      'maze.floorName.3': 'Night of Hearts',
      'maze.floorHint.1': 'Find the key and open the gate!',
      'maze.floorHint.2': 'It’s getting dark… a torch would help!',
      'maze.floorHint.3': 'Heartbreakers roam here. A love potion makes them harmless!',
      'maze.keyFound': 'Key found! Now find the gate.',
      'maze.locked': 'Locked! Find the key first 🔑',
      'maze.torch': 'A torch! You can see much further.',
      'maze.potion': 'Love potion! The Heartbreakers turn shy…',
      'maze.ouch': 'Ouch! A heart broke…',
      'maze.heartbroken': 'Heartbroken! Let’s try this floor again.',
      'maze.floorClear': 'FLOOR CLEAR!',
      'maze.found': 'You found {name}!',
      'maze.par': 'Par {time}',
      'maze.healed': 'Heartbreaker healed!',
      'maze.hint.touch': 'Swipe or use the pad to walk',
      'maze.hint.keys': 'Walk with the arrow keys or WASD',
      'maze.aria': 'Labyrinth. Use the arrow keys, swipe gestures or the direction pad to walk.',
      'maze.dpad': 'Direction pad',

      'final.title': 'THE FINAL QUESTION',
      'final.greeting': 'Dear {name},',
      'final.yes': 'YES! ❤️',
      'final.noPhrases': [
        'No',
        'Are you sure?',
        'Really sure?',
        'Think again!',
        'Last chance!',
        'Surely not?',
        'You might regret this!',
        'Give it another thought!',
        'Are you absolutely certain?',
        'This could be a mistake!',
        'Have a heart!',
        'Don’t be so cold!',
        'Change of heart?',
        'Wouldn’t you reconsider?',
        'Is that your final answer?',
        'You’re breaking my heart ;('
      ],
      'final.yay': 'YAAAY! ❤️',
      'final.letterTitle': 'A letter for you',
      'final.signature': 'With all my love, {name}',
      'final.tapToSkip': 'Tap to skip',
      'final.summaryTitle': 'YOUR LOVE QUEST',
      'final.rewardTitle': 'Special reward unlocked!',
      'final.certificate': 'Save certificate',
      'final.share': 'Share',
      'final.coupons': 'My coupons',
      'final.toMap': 'Back to the map',

      'cert.title': 'CERTIFICATE OF LOVE',
      'cert.line': '{hero} said YES to {beloved}',
      'cert.stats': '{stars} stars · {lp} Love Points',
      'cert.level': 'Love Level {n} · {title}',
      'cert.footer': 'Valid forever. No returns.',
      'cert.fileName': 'love-certificate.png',
      'cert.shareText': 'I said YES! ❤️',

      'results.title': 'TRIAL COMPLETE!',
      'results.score': 'Score',
      'results.best': 'Best',
      'results.newBest': 'NEW BEST!',
      'results.tokens': '+{n} tokens for new stars',
      'results.letter': 'Letter piece {n}/{total} found!',
      'results.unlocked': 'New trial unlocked: {name}',
      'results.retry': 'RETRY',
      'results.map': 'MAP',
      'results.next': 'CONTINUE',

      'pause.title': 'PAUSED',
      'pause.resume': 'RESUME',
      'pause.restart': 'RESTART',
      'pause.quit': 'QUIT TO MAP',

      'settings.title': 'SETTINGS',
      'settings.music': 'Music',
      'settings.sfx': 'Sound effects',
      'settings.crt': 'Retro TV filter',
      'settings.language': 'Language',
      'settings.reset': 'Reset progress',
      'settings.resetTitle': 'Reset everything?',
      'settings.resetText': 'All stars, trophies, tokens and coupons will be lost. This cannot be undone.',
      'settings.resetConfirm': 'RESET',
      'settings.resetDone': 'Progress reset. A fresh start! 🌱',
      'settings.madeWith': 'Made with ❤️ for {name}',

      'trophies.title': 'TROPHIES',
      'trophies.count': '{n} of {total} unlocked',
      'trophies.secret': 'Secret trophy',
      'trophies.secretDesc': 'Keep exploring…',
      'trophies.reward': '+{n} 🪙',

      'letter.title': 'THE SECRET LETTER',
      'letter.progress': '{n}/{total} pieces found',
      'letter.hint': 'Every completed trial reveals another piece. The last one waits at the very end.',
      'letter.missing': 'missing piece',

      'gacha.title': 'LOVE-O-MATIC',
      'gacha.subtitle': 'Spend tokens, win love coupons!',
      'gacha.turn': 'TURN · {n} 🪙',
      'gacha.tokens': 'Your tokens: {n} 🪙',
      'gacha.notEnough': 'You need {n} tokens. Earn them with stars and trophies!',
      'gacha.allWon': 'You won every coupon! 🎉',
      'gacha.tapCapsule': 'Tap the capsule to open it!',
      'gacha.youWon': 'You won:',
      'gacha.tabMachine': 'Machine',
      'gacha.tabCoupons': 'My coupons ({n})',
      'gacha.empty': 'No coupons yet. Give the machine a spin!',
      'gacha.redeem': 'Show this coupon to {name} to redeem it.',
      'gacha.special': 'SPECIAL',
      'gacha.capsule': 'Capsule',

      'ach.unlocked': 'ACHIEVEMENT UNLOCKED',
      'ach.firstSteps.title': 'First Steps',
      'ach.firstSteps.desc': 'Complete your first trial.',
      'ach.comboKing.title': 'Combo Lover',
      'ach.comboKing.desc': 'Reach a x5 combo in Catch the Love.',
      'ach.postman.title': 'Postman of Love',
      'ach.postman.desc': 'Catch all five love letters.',
      'ach.eidetic.title': 'Photographic Memory',
      'ach.eidetic.desc': 'Solve Memories in 8 moves or fewer without peeking.',
      'ach.multiHit.title': 'Two Hearts, One Arrow',
      'ach.multiHit.desc': 'Hit two or more hearts with a single arrow.',
      'ach.robinHood.title': 'Robin Hood',
      'ach.robinHood.desc': 'Hit a golden heart.',
      'ach.mazeRunner.title': 'Maze Runner',
      'ach.mazeRunner.desc': 'Escape the labyrinth.',
      'ach.untouchable.title': 'Untouchable',
      'ach.untouchable.desc': 'Escape the labyrinth without losing a heart.',
      'ach.healer.title': 'Heart Healer',
      'ach.healer.desc': 'Heal a Heartbreaker with the love potion.',
      'ach.knowItAll.title': 'Know-It-All',
      'ach.knowItAll.desc': 'Answer every quiz question right on the first try.',
      'ach.starCollector.title': 'Star Collector',
      'ach.starCollector.desc': 'Earn 3 stars in any trial.',
      'ach.perfectionist.title': 'Perfectionist',
      'ach.perfectionist.desc': 'Earn 3 stars in every trial.',
      'ach.itsAMatch.title': 'It’s a Match!',
      'ach.itsAMatch.desc': 'Say YES to the final question.',
      'ach.lucky.title': 'Lucky Charm',
      'ach.lucky.desc': 'Win your first coupon.',
      'ach.collector.title': 'Coupon Collector',
      'ach.collector.desc': 'Win every coupon in the Love-o-Matic.',
      'ach.cheatCode.title': 'Cheat Code',
      'ach.cheatCode.desc': 'Found the secret of the loading screen.',
      'ach.konami.title': 'Old School',
      'ach.konami.desc': 'Entered the legendary code.',
      'ach.persistent.title': 'Never Gonna Give You Up',
      'ach.persistent.desc': 'Chased the NO button ten times.',

      'toast.levelUp': 'LOVE LEVEL UP!',
      'toast.levelUpText': 'Level {n} · {title}',
      'toast.konami': 'Retro mode unlocked!',

      'rank.1': 'Shy Admirer',
      'rank.2': 'Secret Crush',
      'rank.3': 'Sweetheart',
      'rank.4': 'Darling',
      'rank.5': 'Lovebird',
      'rank.6': 'Romantic',
      'rank.7': 'Heartthrob',
      'rank.8': 'Soulmate',
      'rank.9': 'Love Legend',
      'rank.10': 'Cupid’s Chosen'
    },

    de: {
      'app.title': 'Love Quest',

      'common.close': 'Schliessen',
      'common.cancel': 'ABBRECHEN',
      'common.continue': 'Weiter',
      'common.go': 'LOS!',
      'common.lp': 'LP',
      'common.on': 'AN',
      'common.off': 'AUS',

      'boot.loading': 'LIEBE LÄDT...',
      'boot.hint': 'Halt dich gut fest... bist du bereit?',
      'boot.ready': 'Bereit? Drück Start!',
      'boot.start': 'START DRÜCKEN',
      'boot.cheat': '❤️ CHEAT CODE AKTIVIERT ❤️',

      'select.title': 'WÄHLE DEINE HELDENFIGUR',
      'select.subtitle': 'Wer geht den Weg der Liebe?',
      'select.nameLabel': 'Dein Name',
      'select.go': 'ABENTEUER STARTEN',
      'avatar.rose': 'Rose',
      'avatar.wanderer': 'Wanderer',
      'avatar.sunny': 'Sunny',
      'avatar.royal': 'Royal',

      'intro.skip': 'Überspringen',
      'intro.lines': [
        'Es war einmal ein einsamer Wanderer, der bei den alten Ruinen am Meer stand…',
        'Weit über dem Wasser, hinter goldenen Türmen, wartete ein Herz.',
        'Auf dem Weg dorthin lag ein geheimer Brief verborgen, zerrissen in sechs Teile.',
        'Nur wer die fünf Prüfungen der Liebe besteht, findet alle Teile und erreicht das Schloss.',
        'Deine Reise beginnt jetzt, {name}. Bist du bereit?'
      ],

      'map.title': 'LOVE QUEST',
      'map.letter': 'Brief',
      'map.gacha': 'Love-o-Mat',
      'map.trophies': 'Trophäen',
      'map.settings': 'Optionen',
      'map.locked': 'Schliess zuerst die vorherige Prüfung ab! 🔒',
      'map.play': 'SPIELEN',
      'map.replay': 'NOCHMAL',
      'map.best': 'Rekord: {score} LP',
      'map.noBest': 'Noch nicht gespielt',
      'map.goals': 'Ziele',
      'map.trial': 'Prüfung {n}',
      'map.finale': 'Finale',
      'map.welcomeBack': 'Willkommen zurück, {name}!',
      'map.loveLevel': 'Liebeslevel {n}',
      'map.stats.lp': 'Liebespunkte',
      'map.stats.stars': 'Sterne',
      'map.stats.tokens': 'Münzen',

      'level.catch.title': 'Fang die Liebe',
      'level.catch.desc': 'Herzen schweben in den Himmel! Tippe sie an, um sie zu fangen, sammle Kombos und schnapp dir alle fünf Liebesbriefe. Vorsicht vor gebrochenen Herzen!',
      'level.catch.star1': 'Runde beenden',
      'level.catch.star2': '{n} LP erreichen',
      'level.catch.star3': '{n} LP und alle 5 Briefe fangen',
      'level.memory.title': 'Erinnerungen',
      'level.memory.desc': 'Dreh die Polaroids um und finde alle sechs Paare. Je weniger Züge, desto besser. Festgefahren? Einmal darfst du spicken.',
      'level.memory.star1': 'Alle Paare finden',
      'level.memory.star2': 'Züge ≤ {n}',
      'level.memory.star3': 'Züge ≤ {n}',
      'level.archery.title': 'Amors Pfeil',
      'level.archery.desc': 'Zieh zurück, ziele und lass los, um Amors Pfeile auf die schwebenden Herzen zu schiessen. Ein Pfeil kann mehrere Herzen treffen!',
      'level.archery.star1': 'Alle Pfeile verschiessen',
      'level.archery.star2': '{n} Herzen treffen',
      'level.archery.star3': '{n} Herzen treffen',
      'level.quiz.title': 'Liebesquiz',
      'level.quiz.desc': 'Wie gut kennst du uns? Schnelle Antworten bringen Bonuspunkte, und ein Joker entfernt eine falsche Antwort.',
      'level.quiz.star1': 'Alle Fragen beantworten',
      'level.quiz.star2': 'Fehler ≤ {n}',
      'level.quiz.star3': 'Keine Fehler',
      'level.maze.title': 'Das Labyrinth',
      'level.maze.desc': 'Führe deine Figur durch das Rosengarten-Labyrinth. Finde auf jedem der drei Stockwerke den Schlüssel und öffne das Tor. Nachts streifen die Herzensbrecher umher, also halte Abstand!',
      'level.maze.star1': 'Dem Labyrinth entkommen',
      'level.maze.star2': 'Höchstens 1 Herz verlieren',
      'level.maze.star3': 'Kein Schaden und Bestzeit schlagen',
      'level.final.title': 'Die letzte Frage',
      'level.final.desc': 'Im Schloss wartet jemand mit einer sehr wichtigen Frage…',
      'level.final.goal': 'Antworte mit dem Herzen',

      'hud.pause': 'Pause',
      'hud.score': 'Punkte',
      'hud.time': 'Zeit',
      'hud.combo': 'Kombo',
      'hud.letters': 'Liebesbriefe',
      'hud.moves': 'Züge',
      'hud.pairs': 'Paare',
      'hud.arrows': 'Pfeile übrig',
      'hud.hits': 'Treffer',
      'hud.question': 'Frage',
      'hud.floor': 'Stockwerk',
      'hud.lives': 'Herzen',
      'hud.collected': 'Gesammelte Herzen',
      'hud.key': 'Schlüssel',

      'catch.hint.touch': 'Tippe die Herzen an!',
      'catch.hint.mouse': 'Klicke die Herzen an!',
      'catch.timeUp': 'ZEIT UM!',
      'catch.combo': 'KOMBO x{n}!',
      'catch.letter': 'Liebesbrief {n}/5',

      'memory.peek': 'Spicken',
      'memory.peekUsed': 'Gespickt',
      'memory.cardHidden': 'Verdeckte Karte {n}',
      'memory.cardShown': 'Karte {n}: {item}',
      'memory.photo': 'Foto',
      'memory.match': 'PAAR!',
      'memory.allFound': 'ALLE PAARE GEFUNDEN!',

      'archery.hint.touch': 'Zurückziehen und loslassen zum Schiessen!',
      'archery.hint.mouse': 'Mit der Maus zurückziehen und loslassen, oder ← → ↑ ↓ und Leertaste',
      'archery.aria': 'Bogenschiessen. Irgendwo zurückziehen und loslassen, um zu schiessen.',
      'archery.multi': 'MEHRFACHTREFFER x{n}!',
      'archery.perfect': 'MEISTERSCHUSS!',
      'archery.outOfArrows': 'KEINE PFEILE MEHR!',

      'quiz.progress': 'Frage {n}/{total}',
      'quiz.correct': 'Richtig! ❤️',
      'quiz.wrongDefault': 'Leider nein! Versuch es nochmal 💔',
      'quiz.joker': '50:50 Joker',
      'quiz.jokerUsed': 'Joker benutzt',
      'quiz.bonus': 'Tempobonus',

      'maze.floor': 'Stock {n}/{total}',
      'maze.floorName.1': 'Der Rosengarten',
      'maze.floorName.2': 'Hecken im Abendrot',
      'maze.floorName.3': 'Nacht der Herzen',
      'maze.floorHint.1': 'Finde den Schlüssel und öffne das Tor!',
      'maze.floorHint.2': 'Es wird dunkel… eine Fackel wäre praktisch!',
      'maze.floorHint.3': 'Hier streifen Herzensbrecher umher. Ein Liebestrank macht sie harmlos!',
      'maze.keyFound': 'Schlüssel gefunden! Jetzt das Tor finden.',
      'maze.locked': 'Verschlossen! Zuerst den Schlüssel finden 🔑',
      'maze.torch': 'Eine Fackel! Du siehst viel weiter.',
      'maze.potion': 'Liebestrank! Die Herzensbrecher werden schüchtern…',
      'maze.ouch': 'Autsch! Ein Herz ist zerbrochen…',
      'maze.heartbroken': 'Herzschmerz! Versuchen wir dieses Stockwerk nochmal.',
      'maze.floorClear': 'STOCKWERK GESCHAFFT!',
      'maze.found': 'Du hast {name} gefunden!',
      'maze.par': 'Bestzeit {time}',
      'maze.healed': 'Herzensbrecher geheilt!',
      'maze.hint.touch': 'Wische oder nutze das Steuerkreuz',
      'maze.hint.keys': 'Laufe mit den Pfeiltasten oder WASD',
      'maze.aria': 'Labyrinth. Nutze die Pfeiltasten, Wischgesten oder das Steuerkreuz zum Laufen.',
      'maze.dpad': 'Steuerkreuz',

      'final.title': 'DIE LETZTE FRAGE',
      'final.greeting': '{name}, mein Herz,',
      'final.yes': 'JA! ❤️',
      'final.noPhrases': [
        'Nein',
        'Bist du sicher?',
        'Wirklich sicher?',
        'Denk nochmal nach!',
        'Letzte Chance!',
        'Doch wohl nicht?',
        'Das könntest du bereuen!',
        'Überleg es dir nochmal!',
        'Bist du absolut sicher?',
        'Das könnte ein Fehler sein!',
        'Hab ein Herz!',
        'Sei nicht so kalt!',
        'Sinneswandel?',
        'Willst du es dir nicht überlegen?',
        'Ist das deine endgültige Antwort?',
        'Du brichst mir das Herz ;('
      ],
      'final.yay': 'JUHUUU! ❤️',
      'final.letterTitle': 'Ein Brief für dich',
      'final.signature': 'In Liebe, {name}',
      'final.tapToSkip': 'Tippen zum Überspringen',
      'final.summaryTitle': 'DEINE LOVE QUEST',
      'final.rewardTitle': 'Spezialbelohnung freigeschaltet!',
      'final.certificate': 'Urkunde speichern',
      'final.share': 'Teilen',
      'final.coupons': 'Meine Gutscheine',
      'final.toMap': 'Zurück zur Karte',

      'cert.title': 'URKUNDE DER LIEBE',
      'cert.line': '{hero} hat JA zu {beloved} gesagt',
      'cert.stats': '{stars} Sterne · {lp} Liebespunkte',
      'cert.level': 'Liebeslevel {n} · {title}',
      'cert.footer': 'Gültig für immer. Kein Umtausch.',
      'cert.fileName': 'urkunde-der-liebe.png',
      'cert.shareText': 'Ich habe JA gesagt! ❤️',

      'results.title': 'PRÜFUNG BESTANDEN!',
      'results.score': 'Punkte',
      'results.best': 'Rekord',
      'results.newBest': 'NEUER REKORD!',
      'results.tokens': '+{n} Münzen für neue Sterne',
      'results.letter': 'Briefteil {n}/{total} gefunden!',
      'results.unlocked': 'Neue Prüfung freigeschaltet: {name}',
      'results.retry': 'NOCHMAL',
      'results.map': 'KARTE',
      'results.next': 'WEITER',

      'pause.title': 'PAUSE',
      'pause.resume': 'WEITER',
      'pause.restart': 'NEU STARTEN',
      'pause.quit': 'ZUR KARTE',

      'settings.title': 'OPTIONEN',
      'settings.music': 'Musik',
      'settings.sfx': 'Soundeffekte',
      'settings.crt': 'Retro-TV-Filter',
      'settings.language': 'Sprache',
      'settings.reset': 'Fortschritt zurücksetzen',
      'settings.resetTitle': 'Alles zurücksetzen?',
      'settings.resetText': 'Alle Sterne, Trophäen, Münzen und Gutscheine gehen verloren. Das kann nicht rückgängig gemacht werden.',
      'settings.resetConfirm': 'ZURÜCKSETZEN',
      'settings.resetDone': 'Fortschritt zurückgesetzt. Ein Neuanfang! 🌱',
      'settings.madeWith': 'Mit ❤️ gemacht für {name}',

      'trophies.title': 'TROPHÄEN',
      'trophies.count': '{n} von {total} freigeschaltet',
      'trophies.secret': 'Geheime Trophäe',
      'trophies.secretDesc': 'Erkunde weiter…',
      'trophies.reward': '+{n} 🪙',

      'letter.title': 'DER GEHEIME BRIEF',
      'letter.progress': '{n}/{total} Teile gefunden',
      'letter.hint': 'Jede bestandene Prüfung enthüllt ein weiteres Stück. Das letzte wartet ganz am Schluss.',
      'letter.missing': 'fehlendes Stück',

      'gacha.title': 'LOVE-O-MAT',
      'gacha.subtitle': 'Münzen einwerfen, Liebesgutscheine gewinnen!',
      'gacha.turn': 'DREHEN · {n} 🪙',
      'gacha.tokens': 'Deine Münzen: {n} 🪙',
      'gacha.notEnough': 'Du brauchst {n} Münzen. Verdiene sie mit Sternen und Trophäen!',
      'gacha.allWon': 'Du hast alle Gutscheine gewonnen! 🎉',
      'gacha.tapCapsule': 'Tippe auf die Kapsel, um sie zu öffnen!',
      'gacha.youWon': 'Du hast gewonnen:',
      'gacha.tabMachine': 'Automat',
      'gacha.tabCoupons': 'Meine Gutscheine ({n})',
      'gacha.empty': 'Noch keine Gutscheine. Dreh doch mal am Automaten!',
      'gacha.redeem': 'Zeig diesen Gutschein {name}, um ihn einzulösen.',
      'gacha.special': 'SPEZIAL',
      'gacha.capsule': 'Kapsel',

      'ach.unlocked': 'ERFOLG FREIGESCHALTET',
      'ach.firstSteps.title': 'Erste Schritte',
      'ach.firstSteps.desc': 'Schliesse deine erste Prüfung ab.',
      'ach.comboKing.title': 'Kombo-Liebling',
      'ach.comboKing.desc': 'Erreiche eine x5-Kombo bei Fang die Liebe.',
      'ach.postman.title': 'Liebesbote',
      'ach.postman.desc': 'Fange alle fünf Liebesbriefe.',
      'ach.eidetic.title': 'Fotografisches Gedächtnis',
      'ach.eidetic.desc': 'Löse Erinnerungen in 8 Zügen oder weniger, ohne zu spicken.',
      'ach.multiHit.title': 'Zwei Herzen, ein Pfeil',
      'ach.multiHit.desc': 'Triff zwei oder mehr Herzen mit einem einzigen Pfeil.',
      'ach.robinHood.title': 'Robin Hood',
      'ach.robinHood.desc': 'Triff ein goldenes Herz.',
      'ach.mazeRunner.title': 'Labyrinth-Profi',
      'ach.mazeRunner.desc': 'Entkomme dem Labyrinth.',
      'ach.untouchable.title': 'Unberührbar',
      'ach.untouchable.desc': 'Entkomme dem Labyrinth, ohne ein Herz zu verlieren.',
      'ach.healer.title': 'Herzensheiler',
      'ach.healer.desc': 'Heile einen Herzensbrecher mit dem Liebestrank.',
      'ach.knowItAll.title': 'Besserwisser',
      'ach.knowItAll.desc': 'Beantworte jede Quizfrage beim ersten Versuch richtig.',
      'ach.starCollector.title': 'Sternensammler',
      'ach.starCollector.desc': 'Hole 3 Sterne in einer Prüfung.',
      'ach.perfectionist.title': 'Perfektionist',
      'ach.perfectionist.desc': 'Hole 3 Sterne in jeder Prüfung.',
      'ach.itsAMatch.title': 'Es hat gefunkt!',
      'ach.itsAMatch.desc': 'Sag JA zur letzten Frage.',
      'ach.lucky.title': 'Glückspilz',
      'ach.lucky.desc': 'Gewinne deinen ersten Gutschein.',
      'ach.collector.title': 'Gutscheinsammler',
      'ach.collector.desc': 'Gewinne jeden Gutschein im Love-o-Mat.',
      'ach.cheatCode.title': 'Cheat Code',
      'ach.cheatCode.desc': 'Das Geheimnis des Ladebildschirms entdeckt.',
      'ach.konami.title': 'Old School',
      'ach.konami.desc': 'Den legendären Code eingegeben.',
      'ach.persistent.title': 'Never Gonna Give You Up',
      'ach.persistent.desc': 'Den NEIN-Knopf zehnmal gejagt.',

      'toast.levelUp': 'LIEBESLEVEL AUFGESTIEGEN!',
      'toast.levelUpText': 'Level {n} · {title}',
      'toast.konami': 'Retro-Modus freigeschaltet!',

      'rank.1': 'Schüchternes Herz',
      'rank.2': 'Heimlicher Schwarm',
      'rank.3': 'Schätzchen',
      'rank.4': 'Liebling',
      'rank.5': 'Turteltaube',
      'rank.6': 'Romantik-Profi',
      'rank.7': 'Herzklopfen',
      'rank.8': 'Seelenverwandt',
      'rank.9': 'Liebeslegende',
      'rank.10': 'Amors Liebling'
    }
  };

  const SUPPORTED = Object.freeze(Object.keys(DICT));
  const LOCALES = Object.freeze({ en: 'en-US', de: 'de-CH' });
  const warned = new Set();
  let lang = 'en';

  function lookup(key) {
    const own = DICT[lang] && DICT[lang][key];
    if (own !== undefined) return own;
    const fallback = DICT.en[key];
    if (fallback === undefined && !warned.has(key)) {
      warned.add(key);
      console.warn(`[LoveQuest] Missing text: "${key}"`);
    }
    return fallback;
  }

  function interpolate(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) =>
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match);
  }

  /** Translates a key; {placeholders} are replaced with vars. */
  function t(key, vars) {
    const value = lookup(key);
    if (value === undefined) return key;
    if (Array.isArray(value)) return interpolate(value.join(' '), vars);
    return interpolate(value, vars);
  }

  /** Translates a key that holds a list of texts. */
  function list(key, vars) {
    const value = lookup(key);
    if (value === undefined) return [];
    return [].concat(value).map((entry) => interpolate(entry, vars));
  }

  /** Re-translates static markup (data-i18n, data-i18n-aria, data-i18n-title). */
  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach((node) => {
      node.setAttribute('aria-label', t(node.dataset.i18nAria));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((node) => {
      node.setAttribute('title', t(node.dataset.i18nTitle));
    });
  }

  function setLang(next) {
    if (!SUPPORTED.includes(next)) return false;
    lang = next;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      apply(document);
    }
    return true;
  }

  LQ.i18n = {
    DICT,
    SUPPORTED,
    t,
    list,
    apply,
    setLang,
    get lang() {
      return lang;
    },
    locale() {
      return LOCALES[lang] || 'en-US';
    }
  };
  LQ.t = t;
})(globalThis.LQ = globalThis.LQ || {});
