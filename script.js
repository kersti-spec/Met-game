// API värk
const apiSearchUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/search';
const apiObjectUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/';

async function searchArtobjects (query) {
    const response = await fetch(`${apiSearchUrl}?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data;
}

async function getArtobjectById (id) {
    const response = await fetch(`${apiObjectUrl}${id}`);
    const data = await response.json();
    return data;
}

// print out names and urls of artobjects that have the field primaryImage	
async function printArtobjectsWithImages (results) {
    if (!results || !results.objectIDs) return;
    for (const id of results.objectIDs) {
        const artobject = await getArtobjectById(id);
        const imgUrl = artobject && (artobject.primaryImageSmall || artobject.primaryImage);
        if (imgUrl) {
            console.log(artobject.title, imgUrl);
        }
    }


}

function displayResults (results) {
    resultsContainer.innerHTML = '';
    if (!results || !results.objectIDs) return;
    results.objectIDs.forEach(async (id) => {
        const artobjectData = await getArtobjectById(id);
        if (!artobjectData) return;
        const artobjectElement = document.createElement('div');
        artobjectElement.classList.add('artobject');

        const imageHtml = artobjectData.primaryImageSmall
            ? `<img src="${artobjectData.primaryImageSmall}" alt="${artobjectData.title || 'Artwork'}" />`
            : ''; // no placeholder text shown

        artobjectElement.innerHTML = `
            <h3>${artobjectData.title || 'Untitled'}</h3>
            <p>${artobjectData.artistDisplayName || ''}</p>
            ${imageHtml}
        `;
        resultsContainer.appendChild(artobjectElement);
    });
}

let title = ['Sunflower', 'Daffodill', 'Rose', 'Tulip'];
// Create an HTML string
// let html = '';
// // Loop through each title
// for (let title of title) {
// 	html +=
// 		`<div class="title">
// 			<strong>${title}</strong>
// 		</div>`;
// }

// // Add the HTML to the UI
// document.getElementById('app').innerHTML = html;

// DOM värk
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('results-container');

// Create or update the score box
function setScore(value) {
    let box = document.querySelector('.score-box');
    if (!box) {
        box = document.createElement('div');
        box.className = 'score-box';
        document.body.appendChild(box);
    }
    box.textContent = `Score: ${value}`;
}

// Example: set initial score
setScore(0);

// initialize all async work inside an async function to avoid top-level await errors
async function init() {
    // example startup search (safe checks included)
    const sunflowerResults = await searchArtobjects('sunflower');
    console.log(sunflowerResults);
    if (sunflowerResults && sunflowerResults.objectIDs && sunflowerResults.objectIDs.length) {
        console.log(await getArtobjectById(sunflowerResults.objectIDs[0]));
    renderRandomImageFromResults(sunflowerResults);
    }


    if (searchForm) {
        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const query = searchInput.value;
            const results = await searchArtobjects(query);
            displayResults(results);
            // example: update score when a search runs
            setScore((Math.random()*100).toFixed(0));
        });
    } 
 }




function renderRandomImageFromResults(results) {
    if (!results || !results.objectIDs || !results.objectIDs.length) return;
    const randomIndex = Math.floor(Math.random() * results.objectIDs.length);
    const randomId = results.objectIDs[randomIndex];

    getArtobjectById(randomId).then(artobjectData => {
        if (!artobjectData) return;

        const imgUrl = artobjectData.primaryImageSmall || artobjectData.primaryImage;
        const artworkDisplay = document.getElementById('artworkDisplay');
        const artworkContainer = document.getElementById('artworkContainer');
        const artworkImage = document.getElementById('artworkImage');
        const artworkTitle = document.getElementById('artworkTitle');
        const artworkArtist = document.getElementById('artworkArtist');
        const artworkDept = document.getElementById('artworkDepartment');

        if (imgUrl) {
            // fill UI fields
            artworkImage.src = imgUrl;
            artworkImage.alt = artobjectData.title || 'Artwork';
            artworkTitle.textContent = artobjectData.title || '';
            artworkArtist.textContent = artobjectData.artistDisplayName || '';
            artworkDept.textContent = artobjectData.department || '';

            // set year for the guess logic (Met API provides objectBeginDate / objectEndDate)
            // prefer objectBeginDate when available
            artworkContainer.dataset.year = artobjectData.objectBeginDate || artobjectData.objectEndDate || '';

            // show artwork block (it's before the guess box in the HTML)
            artworkDisplay.classList.remove('hidden');
        } else {
            // hide if no image available
            artworkDisplay.classList.add('hidden');
        }
    }).catch(() => {
        // on error hide artwork
        const artworkDisplay = document.getElementById('artworkDisplay');
        if (artworkDisplay) artworkDisplay.classList.add('hidden');
    });
}

// todo: skoor peaks töötama.
init();

