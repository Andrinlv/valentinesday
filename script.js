// --- KONFIGURATION ---

// Level 1: Die süßen Sprüche für die Herzen
const loveQuotes = [
    "Du bringst mich zum Lächeln!",
    "Mein Herz schlägt für dich 8-bit Style!",
    "Du bist mein Player 2!",
    "Liebe ist... wir beide!",
    "Du bist mein Highscore!"
];

// Level 2: Quiz Fragen (BITTE ANPASSEN!)
// 'correct': Der Index der richtigen Antwort (0, 1 oder 2)
const quizData = [
    {
        question: "Wo haben wir uns das erste Mal geküsst?",
        answers: ["Im Kino", "Im Park", "Auf dem Mond"],
        correct: 1, // 'Im Park' ist hier richtig (Beispiel)
        wrongMsg: "Fast... aber nicht ganz! 🙈"
    },
    {
        question: "Was ist mein absolutes Lieblingsessen?",
        answers: ["Pizza", "Sushi", "Deine Kochkünste"],
        correct: 2,
        wrongMsg: "Autsch! Das solltest du wissen 😜"
    },
    {
        question: "Wie sehr liebe ich dich?",
        answers: ["Ein bisschen", "Unendlich viel", "Mehr als Pizza"],
        correct: 1, // Trickfrage? ;)
        wrongMsg: "Viel mehr! Versuch's nochmal ❤️"
    }
];

// --- STATE MANAGEMENT ---
let collectedHearts = 0;
let currentQuestionIndex = 0;

// Elemente referenzieren
const scenes = {
    loading: document.getElementById('scene-loading'),
    level1: document.getElementById('scene-level1'),
    level2: document.getElementById('scene-level2'),
    end: document.getElementById('scene-end')
};

// --- ORDNER 1: LOADING SCREEN ---
window.onload = () => {
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
    const startBtn = document.getElementById('start-btn');
    let width = 0;

    // Simulierter Ladevorgang mit lustigen Texten
    const loadingTexts = ["Lade Romantik...", "Generiere Schmetterlinge...", "Verstecke Ostereier...", "Fast fertig..."];
    
    const interval = setInterval(() => {
        if (width >= 100) {
            clearInterval(interval);
            loadingText.innerText = "Bereit für Liebe!";
            startBtn.classList.remove('hidden');
        } else {
            width++;
            loadingBar.style.width = width + '%';
            // Text alle 25% ändern
            if(width % 25 === 0) {
                loadingText.innerText = loadingTexts[Math.floor(width/25) -1] || "Laden...";
            }
        }
    }, 30); // Geschwindigkeit des Ladebalkens

    startBtn.addEventListener('click', () => {
        switchScene('level1');
        startLevel1();
    });
};

function switchScene(sceneName) {
    // Alle Szenen ausblenden
    Object.values(scenes).forEach(el => el.classList.remove('active'));
    // Gewünschte Szene einblenden
    scenes[sceneName].classList.add('active');
}

// --- ORDNER 2: LEVEL 1 (RISE) ---
function startLevel1() {
    const container = document.getElementById('hearts-container');
    container.innerHTML = ''; // Reset
    collectedHearts = 0;
    updateHeartCount();

    // 5 Herzen zufällig positionieren
    loveQuotes.forEach((quote, index) => {
        const heart = document.createElement('div');
        heart.classList.add('heart-item');
        heart.innerHTML = '❤️';
        
        // Zufällige Position (mit Randabstand damit man sie klicken kann)
        const x = Math.random() * (window.innerWidth - 100) + 20;
        const y = Math.random() * (window.innerHeight - 200) + 100;
        
        heart.style.left = `${x}px`;
        heart.style.top = `${y}px`;
        // Zufällige Verzögerung für das Schweben
        heart.style.animationDelay = `${Math.random()}s`;

        // Klick Event
        heart.addEventListener('click', (e) => {
            collectHeart(e.target, quote);
        });

        container.appendChild(heart);
    });
}

function collectHeart(element, quote) {
    // Animation und Entfernen
    element.style.transform = "scale(2) rotate(360deg)";
    element.style.opacity = "0";
    setTimeout(() => element.remove(), 500);

    collectedHearts++;
    updateHeartCount();
    showPopup(quote);

    if (collectedHearts === loveQuotes.length) {
        setTimeout(() => {
            alert("Level 1 geschafft! Du hast alle meine Liebe gefunden.");
            switchScene('level2');
            startLevel2();
        }, 1500);
    }
}

function updateHeartCount() {
    document.getElementById('heart-count').innerText = collectedHearts;
}

function showPopup(text) {
    const popup = document.getElementById('msg-popup');
    const p = document.getElementById('popup-text');
    p.innerText = text;
    popup.classList.remove('hidden');
    
    // Nach 2 Sekunden ausblenden
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 2000);
}

// --- ORDNER 3: LEVEL 2 (SHINE - QUIZ) ---
function startLevel2() {
    currentQuestionIndex = 0;
    loadQuestion();
}

function loadQuestion() {
    const qData = quizData[currentQuestionIndex];
    document.getElementById('question-text').innerText = qData.question;
    const answersBox = document.getElementById('answers-box');
    answersBox.innerHTML = '';

    qData.answers.forEach((ans, index) => {
        const btn = document.createElement('button');
        btn.classList.add('answer-btn');
        btn.innerText = ans;
        btn.onclick = () => checkAnswer(index, btn);
        answersBox.appendChild(btn);
    });
}

function checkAnswer(selectedIndex, btnElement) {
    const qData = quizData[currentQuestionIndex];
    const feedback = document.getElementById('feedback-text');

    if (selectedIndex === qData.correct) {
        // RICHTIG
        btnElement.style.background = "rgba(0, 255, 0, 0.5)";
        feedback.innerText = "Richtig! ❤️";
        
        setTimeout(() => {
            currentQuestionIndex++;
            feedback.innerText = "";
            if (currentQuestionIndex < quizData.length) {
                loadQuestion();
            } else {
                switchScene('end');
            }
        }, 1000);
    } else {
        // FALSCH
        btnElement.classList.add('shake');
        feedback.innerText = qData.wrongMsg;
        
        // Easter Egg: Bildschirm wackeln lassen
        document.body.style.transform = "translateX(5px)";
        setTimeout(() => document.body.style.transform = "translateX(0)", 100);

        setTimeout(() => {
            btnElement.classList.remove('shake');
        }, 500);
    }
}

// Replay Button
document.getElementById('replay-btn').addEventListener('click', () => {
    location.reload(); // Seite neu laden für kompletten Neustart
});