// MET API integration and game logic

document.addEventListener('DOMContentLoaded', function() {
    const loadingEl = document.getElementById('loading');
    const artworkImageEl = document.getElementById('artwork-image');
    const artworkInfoEl = document.getElementById('artwork-info');
    const beforeButton = document.getElementById('before-1800');
    const afterButton = document.getElementById('after-1800');
    const resultEl = document.getElementById('result');
    const scoreDisplayEl = document.getElementById('score-display');
    
    let currentArtwork = null;
    const API_BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';
    
    // Score management with localStorage
    function getScore() {
        const savedScore = localStorage.getItem('metGameScore');
        return savedScore ? parseInt(savedScore, 10) : 0;
    }
    
    function saveScore(score) {
        localStorage.setItem('metGameScore', score.toString());
    }
    
    function updateScoreDisplay() {
        const score = getScore();
        scoreDisplayEl.textContent = `Score: ${score}`;
    }
    
    function incrementScore() {
        const currentScore = getScore();
        const newScore = currentScore + 1;
        saveScore(newScore);
        updateScoreDisplay();
    }
    
    // Initialize score display
    updateScoreDisplay();
    
    // Load a random artwork
    async function loadArtwork() {
        loadingEl.style.display = 'block';
        artworkImageEl.style.display = 'none';
        artworkInfoEl.textContent = '';
        resultEl.textContent = '';
        beforeButton.disabled = true;
        afterButton.disabled = true;
        
        try {
            // First, search for 'sunflower' to get array of object IDs
            const searchUrl = `${API_BASE_URL}/search?q=sunflower`;
            console.log('Fetching search URL:', searchUrl);
            const searchResponse = await fetch(searchUrl);
            if (!searchResponse.ok) {
                const errorData = await searchResponse.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${searchResponse.status}`);
            }
            const searchData = await searchResponse.json();
            
            // Check if response contains an error
            if (searchData.error) {
                throw new Error(searchData.message || searchData.error);
            }
            
            if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
                throw new Error('No sunflower artworks found');
            }
            
            // Pick a random object ID from the search results
            const randomIndex = Math.floor(Math.random() * searchData.objectIDs.length);
            const randomObjectID = searchData.objectIDs[randomIndex];
            console.log(`Selected random ID: ${randomObjectID} from ${searchData.objectIDs.length} results`);
            
            // Fetch the artwork details
            const objectUrl = `${API_BASE_URL}/objects/${randomObjectID}`;
            console.log('Fetching object URL:', objectUrl);
            const objectResponse = await fetch(objectUrl);
            if (!objectResponse.ok) {
                const errorData = await objectResponse.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${objectResponse.status}`);
            }
            const artwork = await objectResponse.json();
            
            // Check if response contains an error
            if (artwork.error) {
                throw new Error(artwork.message || artwork.error);
            }
            
            // Check if artwork has an image
            if (!artwork.primaryImage || artwork.primaryImage === '') {
                // If no image, try again
                return loadArtwork();
            }
            
            currentArtwork = artwork;
            
            // Display the artwork
            artworkImageEl.src = artwork.primaryImage;
            artworkImageEl.alt = artwork.title || 'Artwork';
            artworkImageEl.style.display = 'block';
            
            // Display artwork info (title and artist, but not the date)
            let infoText = '';
            if (artwork.title) {
                infoText += artwork.title;
            }
            if (artwork.artistDisplayName) {
                infoText += infoText ? ` by ${artwork.artistDisplayName}` : artwork.artistDisplayName;
            }
            artworkInfoEl.textContent = infoText || 'Unknown artwork';
            
            loadingEl.style.display = 'none';
            beforeButton.disabled = false;
            afterButton.disabled = false;
            
        } catch (error) {
            console.error('Error loading artwork:', error);
            
            let errorMessage = 'Error loading artwork. ';
            if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
                errorMessage += 'The MET API server is currently unavailable. Please try again in a few moments.';
            } else if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
                errorMessage += 'The MET API service is temporarily unavailable. Please try again later.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage += 'Unable to connect to the server. Please check your internet connection.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            loadingEl.textContent = errorMessage;
            loadingEl.style.color = '#8B0000';
            beforeButton.disabled = false;
            afterButton.disabled = false;
        }
    }
    
    // Extract year from objectDate string
    function extractYear(objectDate) {
        if (!objectDate) return null;
        
        // objectDate can be in formats like "1800", "1800-1850", "ca. 1800", etc.
        // Try to extract the first 4-digit year
        const yearMatch = objectDate.match(/\b(\d{4})\b/);
        if (yearMatch) {
            return parseInt(yearMatch[1]);
        }
        
        // If no 4-digit year found, try to get the first number
        const numMatch = objectDate.match(/-?\d+/);
        if (numMatch) {
            const year = parseInt(numMatch[0]);
            // Handle BC dates (negative years)
            if (year < 0) {
                return year;
            }
            // If it's a 2-digit number, assume it's a year (like 99 = 99 AD)
            if (year < 100) {
                return year;
            }
            return year;
        }
        
        return null;
    }
    
    // Handle guess
    function handleGuess(isBefore1800) {
        if (!currentArtwork) return;
        
        const objectDate = currentArtwork.objectDate;
        const year = extractYear(objectDate);
        
        let isCorrect = false;
        let message = '';
        
        if (year === null) {
            message = `Unable to determine the date. The artwork's date is listed as: "${objectDate || 'Unknown'}"`;
        } else {
            const isActuallyBefore1800 = year < 1800;
            isCorrect = isBefore1800 === isActuallyBefore1800;
            
            if (isCorrect) {
                message = `Correct! The artwork is from ${year}.`;
                incrementScore();
            } else {
                message = `Incorrect. The artwork is from ${year}.`;
            }
        }
        
        resultEl.textContent = message;
        resultEl.style.color = year !== null && isCorrect ? '#006400' : '#8B0000';
        
        // Disable buttons after guess
        beforeButton.disabled = true;
        afterButton.disabled = true;
        
        // Load new artwork after a delay
        setTimeout(() => {
            loadArtwork();
        }, 3000);
    }
    
    beforeButton.addEventListener('click', () => handleGuess(true));
    afterButton.addEventListener('click', () => handleGuess(false));
    
    // Load initial artwork
    loadArtwork();
});

