// MET API integration and game logic — 19 rounds total

document.addEventListener('DOMContentLoaded', function () {
  const loadingEl = document.getElementById('loading');
  const artworkImageEl = document.getElementById('artwork-image');
  const artworkInfoEl = document.getElementById('artwork-info');
  const beforeButton = document.getElementById('before-1800');
  const afterButton = document.getElementById('after-1800');
  const resultEl = document.getElementById('result');
  const scoreDisplayEl = document.getElementById('score-display');

  const API_BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';
  const TARGET_COUNT = 19;

  let departments = [];   // first 19 departments (sorted)
  let items = [];         // one artwork per department (can contain null; we handle safely)
  let currentIndex = 0;
  let currentArtwork = null;
  let answeredCount = 0;

  /* ---------- SCORE ---------- */
  function getScore() {
    const savedScore = localStorage.getItem('metGameScore');
    return savedScore ? parseInt(savedScore, 10) : 0;
  }
  function saveScore(score) {
    localStorage.setItem('metGameScore', String(score));
  }
  function updateScoreDisplay() {
    if (scoreDisplayEl) scoreDisplayEl.textContent = `Score: ${getScore()}`;
  }
  function incrementScore() {
    saveScore(getScore() + 1);
    updateScoreDisplay();
  }
  updateScoreDisplay();

  /* ---------- LOGO CLICK ---------- */
  const logoEl = document.getElementById('header-visual');
  if (logoEl) {
    logoEl.style.cursor = 'pointer';
    logoEl.addEventListener('click', () => {
      localStorage.setItem('metGameScore', '0');
      sessionStorage.removeItem('metHeaderPlayed');
      window.location.href = 'index.html';
    });
  }

  /* ---------- HELPERS ---------- */
  function resetResultUI() {
    resultEl.innerHTML = '';
    resultEl.classList.remove('correct', 'incorrect');
    resultEl.removeAttribute('data-status');
  }

  function finishGame() {
    localStorage.setItem('metGameFinalScore', String(getScore()));
    localStorage.setItem('metGameTotal', String(TARGET_COUNT));
    window.location.href = 'gameover.html';
  }

  function setProgress(indexShown) {
    const progressEl = document.getElementById('progress');
    if (progressEl) progressEl.textContent = `${indexShown}/${TARGET_COUNT}`;
  }

  /* ---------- API ---------- */
  async function fetchDepartments() {
    const res = await fetch(`${API_BASE_URL}/departments`);
    if (!res.ok) throw new Error('Failed to fetch departments');
    const json = await res.json();
    const deps = json.departments || [];
    deps.sort((a, b) => a.departmentId - b.departmentId);
    return deps;
  }

  async function fetchOneForDepartment(deptId) {
    const searchUrl = `${API_BASE_URL}/search?departmentId=${deptId}&hasImages=true&q=a`;
    try {
      const sRes = await fetch(searchUrl);
      if (!sRes.ok) return null;

      const sJson = await sRes.json();
      if (!sJson.objectIDs || sJson.objectIDs.length === 0) return null;

      const candidates = sJson.objectIDs.slice();

      // shuffle
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      const tries = Math.min(24, candidates.length);
      for (let i = 0; i < tries; i++) {
        const id = candidates[i];
        try {
          const oRes = await fetch(`${API_BASE_URL}/objects/${id}`);
          if (!oRes.ok) continue; // handles 404 etc
          const obj = await oRes.json();
          if (obj && (obj.primaryImageSmall || obj.primaryImage)) return obj;
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.warn('search failed for dept', deptId, e);
    }
    return null;
  }

  /* ---------- YEAR ---------- */
  function extractYearFromArtwork(artwork) {
    if (!artwork) return null;
    if (typeof artwork.objectBeginDate === 'number' && !Number.isNaN(artwork.objectBeginDate)) {
      return artwork.objectBeginDate;
    }
    const objectDate = artwork.objectDate || '';
    if (!objectDate) return null;

    const yearMatch = objectDate.match(/\b(-?\d{3,4})\b/);
    if (yearMatch) return parseInt(yearMatch[1], 10);

    const numMatch = objectDate.match(/-?\d+/);
    if (numMatch) return parseInt(numMatch[0], 10);

    return null;
  }

  function animateResult(isCorrect) {
    const frame = document.querySelector('.artwork-frame');
    if (!frame) return;

    frame.classList.remove('correct', 'incorrect');
    frame.classList.add(isCorrect ? 'correct' : 'incorrect');

    setTimeout(() => {
      frame.classList.remove('correct', 'incorrect');
    }, 1200);
  }

  /* ---------- RENDER ---------- */
  async function showItem(index) {
    // game ends after 19 answers, not after index
    if (answeredCount >= TARGET_COUNT) {
      finishGame();
      return;
    }

    // if we somehow run out of items, finish gracefully
    if (index >= TARGET_COUNT) {
      finishGame();
      return;
    }

    currentIndex = index;
    resetResultUI();

    const dept = departments[currentIndex];
    let item = items[currentIndex] || null;

    // if item missing (null due to 404 etc), retry a couple of times
    if (!item && dept) {
      loadingEl.style.display = '';
      loadingEl.textContent = 'Loading artwork...';

      for (let attempt = 0; attempt < 2; attempt++) {
        const retry = await fetchOneForDepartment(dept.departmentId);
        if (retry) {
          item = retry;
          items[currentIndex] = retry;
          break;
        }
      }
    }

    // if still no item, skip to next without counting as an answer
    if (!item) {
      // show a tiny note (optional)
      artworkImageEl.style.display = 'none';
      artworkInfoEl.innerHTML = `
        <div class="art-dept">Dept ${currentIndex + 1} of ${TARGET_COUNT}: ${dept ? dept.displayName : 'Unknown'}</div>
        <div style="margin-top:8px;">Could not load an artwork image. Skipping…</div>
      `;
      beforeButton.disabled = true;
      afterButton.disabled = true;
      setProgress(currentIndex + 1);

      setTimeout(() => showItem(currentIndex + 1), 600);
      return;
    }

    currentArtwork = item;

    loadingEl.style.display = 'none';

    const imgUrl = item.primaryImageSmall || item.primaryImage || '';
    if (imgUrl) {
      artworkImageEl.src = imgUrl;
      artworkImageEl.alt = item.title || 'Artwork';
      artworkImageEl.style.display = '';
    } else {
      artworkImageEl.style.display = 'none';
    }

    const title = item.title || 'Untitled';
    const artist = item.artistDisplayName || 'Unknown';
    const deptName = dept ? dept.displayName : 'Unknown';
const round = currentIndex + 1;

artworkInfoEl.innerHTML = `
  <div class="art-dept">Department ${round} of ${TARGET_COUNT}: ${deptName}</div>
  <div class="art-title" style="margin-top:8px; font-weight:700;">${title}</div>
  <div class="art-artist" style="color:#555;">${artist}</div>
`;


    beforeButton.disabled = false;
    afterButton.disabled = false;

    setProgress(currentIndex + 1);
  }

  function advance() {
    resetResultUI();

    // finish strictly after 19 answers
    if (answeredCount >= TARGET_COUNT) {
      finishGame();
      return;
    }

    showItem(currentIndex + 1);
  }

  /* ---------- GUESS ---------- */
  function handleGuess(isBefore1800) {
    if (!currentArtwork) return;

    const year = extractYearFromArtwork(currentArtwork);
    let isCorrect = false;

    if (year === null) {
      resetResultUI();
      resultEl.classList.add('incorrect');
      resultEl.dataset.status = 'Unknown date';
      animateResult(false);

      setTimeout(() => {
        resultEl.innerHTML += `
          <div class="result-meta">
            <span class="result-label">Listed date</span>
            <span class="result-value">${currentArtwork.objectDate || 'Unknown'}</span>
          </div>
        `;
      }, 700);
    } else {
      const actuallyBefore = year < 1800;
      isCorrect = (isBefore1800 === actuallyBefore);

      resetResultUI();
      resultEl.classList.add(isCorrect ? 'correct' : 'incorrect');
      resultEl.dataset.status = isCorrect ? 'Correct' : 'Incorrect';

      if (isCorrect) incrementScore(); // ✅ only once

      animateResult(isCorrect);

      setTimeout(() => {
        resultEl.innerHTML += `
          <div class="result-meta">
            <span class="result-label">Year</span>
            <span class="result-value">${year}</span>
          </div>
        `;
      }, 700);
    }

    beforeButton.disabled = true;
    afterButton.disabled = true;

    // ✅ count the answer every time user guesses
    answeredCount++;

    setTimeout(() => advance(), 2000);
  }

  beforeButton.addEventListener('click', () => handleGuess(true));
  afterButton.addEventListener('click', () => handleGuess(false));

  /* ---------- INIT ---------- */
  async function init() {
    loadingEl.textContent = 'Loading departments...';
    loadingEl.style.color = '';

    try {
      const all = await fetchDepartments();
      departments = all.slice(0, TARGET_COUNT);

      loadingEl.textContent = `Picking artworks (1 per department)...`;

      // parallel fetch is OK, but can yield nulls (we handle later with retries/skips)
      const promises = departments.map(d => fetchOneForDepartment(d.departmentId));
      items = await Promise.all(promises);

      // reset counters on new load
      answeredCount = 0;
      currentIndex = 0;

      showItem(0);
    } catch (err) {
      console.error(err);
      loadingEl.textContent = 'Failed to initialize game.';
      loadingEl.style.color = '#8B0000';
    }
  }

  init();
});
