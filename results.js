const startggURL = "https://api.start.gg/gql/alpha";
const startggKey = "4f3ac3b27603ed696feaaf945c34178b";
let tournamentSlug;
let eventSlug;
let eventId;
let resultContainer = document.getElementById('finalResults');

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

document.getElementById('searchBtn').addEventListener('click', async () => {

    resultContainer.classList.remove('fade-in');
    void resultContainer.offsetHeight;
    resultContainer.classList.add('fade-out');

    await new Promise(resolve => {
        resultContainer.addEventListener('animationend', resolve, { once: true });
    });

    resultContainer.innerHTML = '';

    tournamentSlug = document.getElementById('tournamentInput').value;
    eventSlug = document.getElementById('eventInput').value;

    await getEventId();
    await getRecentSets();

    resultContainer.classList.remove('fade-out');
    void resultContainer.offsetHeight;
    resultContainer.classList.add('fade-in');
});

async function getRecentSets() {
    const res = await fetch(startggURL, {
        method: "POST",
        headers: {
            'content-type': "application/json",
            'Accept': "application/json",
            Authorization: 'Bearer ' + startggKey
        },
        body: JSON.stringify({
            query: "query getTournamentData( $tourneySlug: String! $eventId: EventFilter! $page: Int! ) { tournament(slug: $tourneySlug) { events(filter: $eventId) { sets(page: $page, perPage: 5, sortType: RECENT, filters: {showByes: false, hideEmpty: true}) { nodes { slots { standing { entrant { participants { gamerTag } } stats { score { value } } } } } } } } }",
            variables: {
                tourneySlug: tournamentSlug,
                eventId: { id: eventId },
                page: 1
            }
        })
    });

    const data = await res.json();
    let recentSets = data.data.tournament.events[0].sets.nodes;

    for (let i = 0; i < recentSets.length; i++) {
        let result = document.createElement('div');
        result.classList.add('result');

        result.style.animationDelay = `${i * 0.2}s`;

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

        let p1 = recentSets[i].slots[0].standing;
        let p2 = recentSets[i].slots[1].standing;

        let name1 = p1.entrant.participants[0].gamerTag;
        let name2 = p2.entrant.participants[0].gamerTag;
        let score1 = p1.stats.score.value;
        let score2 = p2.stats.score.value;

        if (score1 > score2) {
            if (score1 === -1) {
                score1 = "DQ";
            } else if (score2 === -1) {
                score2 = "DQ";
            }
            playerWin.innerText = name1;
            scoreWin.innerText = score1;
            playerLose.innerText = name2;
            scoreLose.innerText = score2;
        } else {
            if (score1 === -1) {
                score1 = "DQ";
                score2 = "W";
            } else if (score2 === -1) {
                score2 = "DQ";
                score1 = "W";
            };
            playerWin.innerText = name2;
            scoreWin.innerText = score2;
            playerLose.innerText = name1;
            scoreLose.innerText = score1;
        };

        winContainer.append(playerWin, scoreWin);
        loseContainer.append(playerLose, scoreLose);
        result.append(winContainer, loseContainer);

        resultContainer.appendChild(result);
    };
};