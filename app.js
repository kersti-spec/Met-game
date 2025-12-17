// MET API integration and game logic — select one artwork per department in ascending departmentId order

document.addEventListener('DOMContentLoaded', function() {
    const loadingEl = document.getElementById('loading');
    const artworkImageEl = document.getElementById('artwork-image');
    const artworkInfoEl = document.getElementById('artwork-info');
    const beforeButton = document.getElementById('before-1800');
    const afterButton = document.getElementById('after-1800');
    const resultEl = document.getElementById('result');
    const scoreDisplayEl = document.getElementById('score-display');

    const API_BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';

    // Fallback total departments to 21 (API currently returns 21)
    const TOTAL_DEPS_FALLBACK = 19;

    let departments = [];   // list of departments sorted by departmentId
    let items = [];         // chosen artwork per department (same order as departments)
    let currentIndex = 0;   // index into items / departments
    let currentArtwork = null;

    // Score management
    function getScore() {
        const savedScore = localStorage.getItem('metGameScore');
        return savedScore ? parseInt(savedScore, 10) : 0;
    }
    function saveScore(score) {
        localStorage.setItem('metGameScore', score.toString());
    }
    function updateScoreDisplay() {
        scoreDisplayEl.textContent = `Score: ${getScore()}`;
    }
    function incrementScore() {
        saveScore(getScore() + 1);
        updateScoreDisplay();
    }
    updateScoreDisplay();

    // Logo click: reset score + go to index.html
const logoEl = document.getElementById('logo');
if (logoEl) {
    logoEl.style.cursor = 'pointer';
    logoEl.addEventListener('click', () => {
        localStorage.setItem('metGameScore', '0'); // reset score
        window.location.href = 'index.html';
    });
}

    

    // Fetch departments and sort by departmentId ascending
    async function fetchDepartments() {
        const res = await fetch(`${API_BASE_URL}/departments`);
        if (!res.ok) throw new Error('Failed to fetch departments');
        const json = await res.json();
        const deps = json.departments || [];
        deps.sort((a, b) => a.departmentId - b.departmentId);
        return deps;
    }

    // Fetch one artwork (with image) for a given departmentId
    async function fetchOneForDepartment(deptId) {
        const searchUrl = `${API_BASE_URL}/search?departmentId=${deptId}&hasImages=true&q=a`;
        try {
            const sRes = await fetch(searchUrl);
            if (!sRes.ok) return null;
            const sJson = await sRes.json();
            if (!sJson.objectIDs || sJson.objectIDs.length === 0) return null;

            // shuffle and try up to 12 candidates to find one with an image
            const candidates = sJson.objectIDs.slice();
            for (let i = candidates.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }

            const tries = Math.min(12, candidates.length);
            for (let i = 0; i < tries; i++) {
                const id = candidates[i];
                try {
                    const oRes = await fetch(`${API_BASE_URL}/objects/${id}`);
                    if (!oRes.ok) continue;
                    const obj = await oRes.json();
                    if (obj && (obj.primaryImageSmall || obj.primaryImage)) return obj;
                } catch (e) {
                    // ignore and continue
                }
            }
        } catch (e) {
            console.warn('search failed for dept', deptId, e);
        }
        return null;
    }

    // Render a given item index
    function showItem(index) {
        currentIndex = index;
        currentArtwork = items[currentIndex] || null;
        resultEl.textContent = '';
        loadingEl.style.display = 'none';
        console.log('deps length:', departments.length, departments);

        const totalDeps = departments.length || TOTAL_DEPS_FALLBACK;

        if (!currentArtwork) {
            artworkImageEl.style.display = 'none';
            artworkInfoEl.innerHTML = `<div class="art-dept">Dept ${departments[currentIndex] ? departments[currentIndex].departmentId : '—'} of ${totalDeps}: ${departments[currentIndex] ? departments[currentIndex].displayName : 'Unknown'}</div>
                                      <div style="margin-top:8px;">No artwork with image found for this department.</div>`;
            beforeButton.disabled = true;
            afterButton.disabled = true;
            // update progress indicator
            const progressEl = document.getElementById('progress');
            if (progressEl) progressEl.textContent = `${currentIndex + 1}/${totalDeps}`;
            return;
        }

        // show image
        const imgUrl = currentArtwork.primaryImageSmall || currentArtwork.primaryImage || '';
        if (imgUrl) {
            artworkImageEl.src = imgUrl;
            artworkImageEl.alt = currentArtwork.title || 'Artwork';
            artworkImageEl.style.display = '';
        } else {
            artworkImageEl.style.display = 'none';
        }

        // show dept number/name, then title and author BELOW image (keeps year hidden here)
        const deptId = departments[currentIndex] ? departments[currentIndex].departmentId : '—';
        const deptName = departments[currentIndex] ? departments[currentIndex].displayName : 'Unknown';
        const title = currentArtwork.title || 'Untitled';
        const artist = currentArtwork.artistDisplayName || 'Unknown';
        artworkInfoEl.innerHTML = `
            <div class="art-dept">Dept ${deptId} of ${totalDeps}: ${deptName}</div>
            <div class="art-title" style="margin-top:8px; font-weight:700;">${title}</div>
            <div class="art-artist" style="color:#555;">${artist}</div>
        `;

        beforeButton.disabled = false;
        afterButton.disabled = false;

        // update small progress indicator in header if present (1/21)
        const progressEl = document.getElementById('progress');
        if (progressEl) {
            progressEl.textContent = `${currentIndex + 1}/${totalDeps}`;
        }
    }

    // Advance to next department (skip nulls if desired or show placeholders)
    function advance() {
        let next = currentIndex + 1;
        if (next >= items.length) {
            // finished
            const totalDeps = departments.length || TOTAL_DEPS_FALLBACK;
            loadingEl.textContent = 'Game complete — no more departments.';
            artworkImageEl.style.display = 'none';
            beforeButton.disabled = true;
            afterButton.disabled = true;
            const progressEl = document.getElementById('progress');
            if (progressEl) progressEl.textContent = `${totalDeps}/${totalDeps}`;
            return;
        }
        showItem(next);
    }

    // Extract year from artwork object
    function extractYearFromArtwork(artwork) {
        if (!artwork) return null;
        if (typeof artwork.objectBeginDate === 'number' && !Number.isNaN(artwork.objectBeginDate)) return artwork.objectBeginDate;
        const objectDate = artwork.objectDate || '';
        if (!objectDate) return null;
        const yearMatch = objectDate.match(/\b(-?\d{3,4})\b/);
        if (yearMatch) return parseInt(yearMatch[1], 10);
        const numMatch = objectDate.match(/-?\d+/);
        if (numMatch) return parseInt(numMatch[0], 10);
        return null;
    }

    // Handle guess and reveal year after verdict (year shown separately)
    function handleGuess(isBefore1800) {
        if (!currentArtwork) {
            resultEl.textContent = 'No artwork to check.';
            return;
        }
        const year = extractYearFromArtwork(currentArtwork);
        if (year === null) {
            resultEl.textContent = 'Unable to determine the date for this artwork.';
            resultEl.style.color = '#8B0000';
            setTimeout(() => {
                const reveal = document.createElement('div');
                reveal.className = 'reveal-year';
                reveal.textContent = `Listed date: ${currentArtwork.objectDate || 'Unknown'}`;
                reveal.style.marginTop = '6px';
                reveal.style.fontSize = '13px';
                reveal.style.color = '#333';
                resultEl.appendChild(reveal);
            }, 900);
        } else {
            const actuallyBefore = year < 1800;
            const isCorrect = (isBefore1800 === actuallyBefore);
            resultEl.textContent = isCorrect ? 'Correct!' : 'Incorrect.';
            resultEl.style.color = isCorrect ? '#006400' : '#8B0000';
            if (isCorrect) incrementScore();
            setTimeout(() => {
                const reveal = document.createElement('div');
                reveal.className = 'reveal-year';
                reveal.textContent = `Year: ${year}`;
                reveal.style.marginTop = '6px';
                reveal.style.fontSize = '13px';
                reveal.style.color = '#333';
                resultEl.appendChild(reveal);
            }, 900);
        }
        beforeButton.disabled = true;
        afterButton.disabled = true;

        setTimeout(() => advance(), 2000);
    }

    beforeButton.addEventListener('click', () => handleGuess(true));
    afterButton.addEventListener('click', () => handleGuess(false));

    // Initialization: fetch departments (sorted) and pick one artwork per department in that order
    async function init() {
        loadingEl.textContent = 'Loading departments...';
        try {
            departments = await fetchDepartments();
            const totalDeps = departments.length || TOTAL_DEPS_FALLBACK;
            loadingEl.textContent = `Found ${totalDeps} departments — picking one artwork from each (in order)...`;

            // fetch one artwork per department in parallel (keeps order)
            const promises = departments.map(d => fetchOneForDepartment(d.departmentId));
            const results = await Promise.all(promises);
            items = results; // same order as departments array

            // start at first department that has an item (or 0)
            currentIndex = 0;
            // don't skip nulls automatically; show placeholders if no artwork
            showItem(currentIndex);
        } catch (err) {
            console.error(err);
            loadingEl.textContent = 'Failed to initialize game.';
            loadingEl.style.color = '#8B0000';
        }
    }

    init();

   
});

