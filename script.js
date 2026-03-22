const startggURL = "https://api.start.gg/gql/alpha";
const startggKey = "4f3ac3b27603ed696feaaf945c34178b";
const nameContainer = document.getElementById('name-container');
const noNameContainer = document.getElementById('no-name-container');
const selectForm = document.getElementById('name-select');
const emptyModal = document.querySelector('.popup-container');
let tournamentSlug;
let nameList = [];

fetch('./tester.json')
    .then(res => res.json())
    .then(data => tournamentSlug = data[0].slug);

async function search(slug) {
    const res = await fetch(startggURL, {
        method: "POST",
        headers: {
            'content-type': "application/json",
            'Accept': "application/json",
            Authorization: 'Bearer ' + startggKey
        },
        body: JSON.stringify({
            query: `
                query getTournamentData($tourneySlug:String!) {
                    tournament(slug: $tourneySlug) {
                        participants(query: {page: 1, perPage: 300}, isAdmin: true) {
                            nodes {
                                gamerTag
                                user { id name images { type url } }
                            }
                        }
                    }
                }`,
            variables: { tourneySlug: slug }
        })
    });

    const data = await res.json();
    const entrants = data.data.tournament.participants.nodes;

    entrants.sort((a, b) =>
        a.gamerTag.localeCompare(b.gamerTag, undefined, { sensitivity: 'base' })
    );

    nameList = [];
    nameContainer.innerHTML = '';
    selectForm.innerHTML = '';

    entrants.forEach(account => {
        const player = document.createElement('p');
        const link = document.createElement('a');
        const img = document.createElement('img');

        if (!account.user) {
            link.classList.add('no-image');
            nameContainer.appendChild(link);
        } else if (account.user.images.length === 0) {
            nameList.push(account.gamerTag);
        } else {
            link.appendChild(img);

            if (account.user.images.length === 2 && account.user.images[0].type === 'banner') {
                img.src = account.user.images[1].url;
                link.href = account.user.images[1].url;
            } else {
                img.src = account.user.images[0].url;
                link.href = account.user.images[0].url;
            }

            player.innerText = account.gamerTag;
            link.appendChild(player);
            link.target = "_blank";
            link.classList.add('has-image');
            nameContainer.appendChild(link);
        }
    });

    nameList
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .forEach(name => {
            const option = document.createElement('option');
            option.textContent = name;
            option.value = name;
            selectForm.appendChild(option);
        });

    const items = nameContainer.querySelectorAll('.has-image');
    items.forEach((item, i) => {
        setTimeout(() => item.classList.add('show'), i * 50);
    });
}

document.getElementById('searchBtn').addEventListener('click', () => {
    tournamentSlug = document.getElementById('searchInput').value;

    if (tournamentSlug === '') {
        emptyModal.classList.remove('hidden');
        setTimeout(() => emptyModal.classList.add('hidden'), 1900);
        return;
    };

    nameContainer.innerHTML = '';
    noNameContainer.innerHTML = '';
    selectForm.innerHTML = '';

    setTimeout(() => search(tournamentSlug), 200);
});