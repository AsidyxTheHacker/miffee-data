const startggURL = "https://api.start.gg/gql/alpha";
const startggKey = "4f3ac3b27603ed696feaaf945c34178b";

let tournamentSlug;
let eventSlug;
let eventId;

let resultContainer = document.getElementById('finalResults');
let refreshTimerEl = document.getElementById('refreshTimer');

let refreshInterval = null;
let countdownInterval = null;
let isFetching = false;

const REFRESH_TIME = 300000; // 5 minutes
const FADE_DURATION = 400;   // match CSS (0.4s)

let nextRefreshTime = null;

// -------------------- TIMER --------------------
function startCountdown() {
    clearInterval(countdownInterval);
    nextRefreshTime = Date.now() + REFRESH_TIME;

    countdownInterval = setInterval(() => {
        const timeLeft = nextRefreshTime - Date.now();

        if (timeLeft <= 0) {
            refreshTimerEl.textContent = "0:00";
            return;
        }

        let minutes = Math.floor(timeLeft / 60000);
        let seconds = Math.floor((timeLeft % 60000) / 1000);

        refreshTimerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

// -------------------- EVENT ID --------------------
async function getEventId() {
    const finalSlug = `tournament/${tournamentSlug}/event/${eventSlug}`;

    const res = await fetch(startggURL, {
        method: "POST",
        headers: {
            'content-type': "application/json",
            'Accept': "application/json",
            Authorization: 'Bearer ' + startggKey
        },
        body: JSON.stringify({
            query: "query EventQuery($slug:String) {event(slug: $slug) {id name}}",
            variables: { slug: finalSlug }
        })
    });

    const data = await res.json();
    eventId = data.data.event.id;
}

// -------------------- RECENT SETS --------------------
async function getRecentSets() {
    if (isFetching) return;
    isFetching = true;

    const children = Array.from(resultContainer.children);

    // ------------------ FADE OUT OLD RESULTS ------------------
    if (children.length > 0) {
        children.forEach((child, i) => {
            child.style.opacity = .1;
            child.style.animation = `fadeOut ${FADE_DURATION}ms ease`;
        });

        // Wait for all fade-out animations
        await Promise.all(children.map(child =>
            new Promise(resolve => child.addEventListener('animationend', resolve, { once: true }))
        ));

        resultContainer.innerHTML = ''; // remove all after fade-out
    }

    try {
        const res = await fetch(startggURL, {
            method: "POST",
            headers: {
                'content-type': "application/json",
                'Accept': "application/json",
                Authorization: 'Bearer ' + startggKey
            },
            body: JSON.stringify({
                query: `query getTournamentData($tourneySlug: String!, $eventId: EventFilter!, $page: Int!) {
                    tournament(slug: $tourneySlug) {
                        events(filter: $eventId) {
                            sets(page: $page, perPage: 5, sortType: RECENT, filters: {showByes: false, hideEmpty: true}) {
                                nodes {
                                    slots {
                                        standing {
                                            entrant {
                                                participants {
                                                    gamerTag
                                                }
                                            }
                                            stats {
                                                score {
                                                    value
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }`,
                variables: {
                    tourneySlug: tournamentSlug,
                    eventId: { id: eventId },
                    page: 1
                }
            })
        });

        const data = await res.json();
        let recentSets = data.data.tournament.events[0].sets.nodes;

        // ------------------ APPEND NEW RESULTS WITH FADE-IN ------------------
        recentSets.forEach((set, i) => {
            let result = document.createElement('div');
            result.classList.add('result');
            result.style.opacity = 0;
            result.style.animation = `fadeItemIn ${FADE_DURATION}ms ease forwards`;
            result.style.animationDelay = `${i * 0.1}s`; // stagger slightly

            let winContainer = document.createElement('div');
            let loseContainer = document.createElement('div');
            let scoreWin = document.createElement('p');
            let scoreLose = document.createElement('p');
            let playerWin = document.createElement('p');
            let playerLose = document.createElement('p');

            winContainer.classList.add('win-container');
            loseContainer.classList.add('lose-container');
            scoreWin.classList.add('score-text-win');
            scoreLose.classList.add('score-text-lose');
            playerWin.classList.add('player-text-win');
            playerLose.classList.add('player-text-lose');

            let p1 = set.slots[0].standing;
            let p2 = set.slots[1].standing;

            let name1 = p1.entrant.participants[0].gamerTag;
            let name2 = p2.entrant.participants[0].gamerTag;
            let score1 = p1.stats.score.value;
            let score2 = p2.stats.score.value;

            const isName1Long = name1.length >= 8;
            const isName2Long = name2.length >= 8;

            if (score1 === -1) {
                playerWin.innerText = name2;
                scoreWin.innerText = "W";
                playerLose.innerText = name1;
                scoreLose.innerText = "DQ";
                if (isName2Long) playerWin.classList.add('long-name');
                if (isName1Long) playerLose.classList.add('long-name');
                scoreWin.classList.add('dq-score-win');
                scoreLose.classList.add('dq-score-lose', 'score-text-dq');
            } else if (score2 === -1) {
                playerWin.innerText = name1;
                scoreWin.innerText = "W";
                playerLose.innerText = name2;
                scoreLose.innerText = "DQ";
                if (isName1Long) playerWin.classList.add('long-name');
                if (isName2Long) playerLose.classList.add('long-name');
                scoreWin.classList.add('dq-score-win');
                scoreLose.classList.add('dq-score-lose', 'score-text-dq');
            } else if (score1 > score2) {
                playerWin.innerText = name1;
                scoreWin.innerText = score1;
                playerLose.innerText = name2;
                scoreLose.innerText = score2;
                if (isName1Long) playerWin.classList.add('long-name');
                if (isName2Long) playerLose.classList.add('long-name');
            } else {
                playerWin.innerText = name2;
                scoreWin.innerText = score2;
                playerLose.innerText = name1;
                scoreLose.innerText = score1;
                if (isName2Long) playerWin.classList.add('long-name');
                if (isName1Long) playerLose.classList.add('long-name');
            }

            winContainer.append(playerWin, scoreWin);
            loseContainer.append(playerLose, scoreLose);
            result.append(winContainer, loseContainer);
            resultContainer.appendChild(result);
        });

    } finally {
        isFetching = false;
    }
}

// -------------------- BUTTON --------------------
document.getElementById('searchBtn').addEventListener('click', async () => {
    if (refreshInterval) clearInterval(refreshInterval);
    if (countdownInterval) clearInterval(countdownInterval);

    tournamentSlug = document.getElementById('tournamentInput').value;
    eventSlug = document.getElementById('eventInput').value;

    await getEventId();
    await getRecentSets(); // ✅ handles fade-out + fade-in

    startCountdown();

    refreshInterval = setInterval(async () => {
        await getRecentSets();
        nextRefreshTime = Date.now() + REFRESH_TIME;
    }, REFRESH_TIME);
});

// -------------------- VALIDATION --------------------
function validateInputs() {
    const tournamentInput = document.getElementById('tournamentInput').value.trim();
    const eventInput = document.getElementById('eventInput').value.trim();
    const searchBtn = document.getElementById('searchBtn');

    searchBtn.disabled = (!tournamentInput || !eventInput);
}

document.getElementById('tournamentInput').addEventListener('input', validateInputs);
document.getElementById('eventInput').addEventListener('input', validateInputs);