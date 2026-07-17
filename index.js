const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const FAVORITES_KEY = "wordly_favorites";
const THEME_KEY = "wordly_theme";

const searchForm = document.getElementById("searchForm");
const wordInput = document.getElementById("wordInput");
const searchBtn = searchForm.querySelector(".btn");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const resultCard = document.getElementById("resultCard");
const resultWord = document.getElementById("resultWord");
const resultPhonetic = document.getElementById("resultPhonetic");
const audioBtn = document.getElementById("audioBtn");
const favoriteBtn = document.getElementById("favoriteBtn");
const meaningsContainer = document.getElementById("meaningsContainer");
const sourceLink = document.getElementById("sourceLink");
const favoritesEmpty = document.getElementById("favoritesEmpty");
const favoritesList = document.getElementById("favoritesList");
const themeToggle = document.getElementById("themeToggle");

//initializations
let currentAudioUrl = null; // Stores audio url for pronunciation
let currentAudio = null; // Audio object for playback
let currentWord = null; // Currently searched word
let currentPhoneticText = ""; // Phonetic spelling of the word

// When the page finishes loading, immediately show any saved favorites
// and apply the last chosen theme (light or dark).
document.addEventListener("DOMContentLoaded", () => {
    displayFavorites();
    restoreTheme();
});


// Event listeners for user interactions
searchForm.addEventListener("submit", handleSearch);
audioBtn.addEventListener("click", playAudio);
favoriteBtn.addEventListener("click", toggleFavoriteForCurrentWord);
themeToggle.addEventListener("click", toggleTheme);

// Search Handling
function handleSearch(event) {
    event.preventDefault(); //stop the form from refreshing the page

    const rawValue = wordInput.value;
    const word = rawValue.trim().toLowerCase();

    clearErrors(); //remove previous error messages before new search

    if (!word) {
        displayError("Please enter a word.");
        return;
    }
    clearResults(); //clear previous results
    setLoading(true); // show "loading" and disable the button
    fetchWord(word); // Fetch word definition from API
}

async function fetchWord(word) {
    try {
        const response = await fetch(`${API_BASE}${encodeURIComponent(word)}`);
        /*encodeURIComponent(word) ensures special characters
        (like spaces or punctuation) don’t break the URL.*/

        if (!response.ok) {
            // Handle errors
            if (response.status === 404) {
                //error 404 means server was reached bur resource wasn't there
                displayError("We could not find that word. Check the spelling and try again.");

            } else {
                displayError("Something went wrong while loading the definition. Please try again.");
            }
            return;
        }

        //convert API response to js array
        const data = await response.json();

        //validation if the API returns an empty value
        if (!Array.isArray(data) || data.length === 0 || !data[0]) {
            displayError("Something went wrong while loading the definition. Please try again.");
            return;
        }

        displayWord(data[0]); //function to Show word details
    } catch (err) {
        displayError("Something went wrong while loading the definition. Please try again.");
    } finally {
        setLoading(false);
    }
}

// Display Functions
function displayWord(entry) {
    clearResults();

    // Set current word and phonetic spelling
    currentWord = entry.word || wordInput.value.trim();
     const { text, audio } = getPhonetics(entry);
         currentPhoneticText = text;
        currentAudioUrl = audio;

    resultWord.textContent = currentWord;
    resultPhonetic.textContent = currentPhoneticText;

    // If audio is available, show the button and prepare playback
    if (currentAudioUrl) {
        audioBtn.classList.remove("hidden");
        currentAudio = new Audio(currentAudioUrl);
    } else {
        audioBtn.classList.add("hidden");
        currentAudio = null;
    }

    // Loop through meanings and show definitions, examples, and synonyms
    const meanings = Array.isArray(entry.meanings) ? entry.meanings : [];
    meanings.forEach((meaning) => {
        const block = document.createElement("div");
        block.className = "meaning-block";

        const heading = document.createElement("h3");
        heading.textContent = meaning.partOfSpeech || "Meaning";
        block.appendChild(heading);

        const definitions = Array.isArray(meaning.definitions) ? meaning.definitions : [];
        definitions.forEach((def) => {
            const defItem = document.createElement("div");
            defItem.className = "definition-item";

            const defText = document.createElement("p");
            defText.textContent = def.definition || "";
            defItem.appendChild(defText);

            if (def.example) {
                const exampleText = document.createElement("p");
                exampleText.className = "definition-example";
                exampleText.textContent = `"${def.example}"`;
                defItem.appendChild(exampleText);
            }

            block.appendChild(defItem);
        });

        // add and display synonyms if available
        const synonyms = getSynonyms(meaning);
        if (synonyms.length > 0) {
            const synWrap = document.createElement("div");
            synWrap.className = "synonyms";

            const synLabel = document.createElement("strong");
            synLabel.textContent = "Synonyms: ";
            synWrap.appendChild(synLabel);

            synonyms.forEach((syn) => {
                const synSpan = document.createElement("span");
                synSpan.textContent = syn;
                synWrap.appendChild(synSpan);
            });

            block.appendChild(synWrap);
        }

        meaningsContainer.appendChild(block);
    });

    // Display source link if available
    if (Array.isArray(entry.sourceUrls) && entry.sourceUrls.length > 0 && entry.sourceUrls[0]) {
        sourceLink.href = entry.sourceUrls[0];
        sourceLink.textContent = "View source";
        sourceLink.classList.remove("hidden");
    } else {
        sourceLink.classList.add("hidden");
    }

    updateFavoriteButton();
    resultCard.classList.remove("hidden");
}

// Helper functions for phonetics, audio, and synonyms
function getPhonetics(entry) {
  const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
  const text = entry.phonetic || (phonetics.find(p => p.text)?.text || "");
  const audio = phonetics.find(p => p.audio)?.audio || null;
  return { text, audio };
}

function getSynonyms(meaning) {
    const meaningLevel = Array.isArray(meaning.synonyms) ? meaning.synonyms : [];
    const definitionLevel = Array.isArray(meaning.definitions)
        ? meaning.definitions.flatMap((def) => (Array.isArray(def.synonyms) ? def.synonyms : []))
        : [];
    return [...new Set([...meaningLevel, ...definitionLevel])]; // Remove duplicates
}

//remove previous error messages before new search
function clearResults() {
    meaningsContainer.innerHTML = "";   // Remove all previous meanings
    resultWord.textContent = "";        // Clear the displayed word
    resultPhonetic.textContent = "";    // Clear the phonetic spelling
    sourceLink.classList.add("hidden"); // Hide the source link
    audioBtn.classList.add("hidden");   // Hide the audio button
    resultCard.classList.add("hidden"); // Hide the entire result card
    currentAudio = null;                // Reset audio object
    currentAudioUrl = null;             // Reset audio URL
}

function displayError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
}

function clearErrors() {
    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
}

// show "loading" and disable the button
function setLoading(isLoading) {
    loadingMessage.classList.toggle("hidden", !isLoading);
    searchBtn.disabled = isLoading;
}

// Audio Playback
function playAudio() {
    if (!currentAudio) return;
    currentAudio.play().catch(() => {
        displayError("Audio could not be played right now.");
    });
}

// Favorites
function getFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function isFavorite(word) {
    return getFavorites().some((fav) => fav.word.toLowerCase() === word.toLowerCase());
}

function saveFavorite(word, phonetic) {
    const favorites = getFavorites();
    if (isFavorite(word)) return;
    favorites.push({ word, phonetic: phonetic || "" });
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    displayFavorites();
}

function removeFavorite(word) {
    const favorites = getFavorites().filter(
        (fav) => fav.word.toLowerCase() !== word.toLowerCase()
    );
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    displayFavorites();
}

function toggleFavoriteForCurrentWord() {
    if (!currentWord) return;
    if (isFavorite(currentWord)) {
        removeFavorite(currentWord);
    } else {
        saveFavorite(currentWord, currentPhoneticText);
    }
    updateFavoriteButton();
}

// Theme toggle
function toggleTheme() {
    const isLight = document.body.classList.toggle("light-theme");
    themeToggle.textContent = isLight ? "☀️" : "🌙";
    localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
}

function restoreTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light") {
        document.body.classList.add("light-theme");
        themeToggle.textContent = "☀️";
    }
}

function updateFavoriteButton() {
    if (!currentWord) return;
    const saved = isFavorite(currentWord);

    if (saved) {
        favoriteBtn.textContent = "Saved";
        favoriteBtn.classList.add("saved");
    } else {
        favoriteBtn.textContent = "Save";
        favoriteBtn.classList.remove("saved");
    }
}

// Favorites display function
function displayFavorites() {
    const favorites = getFavorites();
    favoritesList.innerHTML = ""; // clear old list

    if (favorites.length === 0) {
        favoritesEmpty.classList.remove("hidden");
        return;
    }

    favoritesEmpty.classList.add("hidden");

    favorites.forEach((fav) => {
        const li = document.createElement("li");
        li.textContent = `${fav.word} ${fav.phonetic ? `(${fav.phonetic})` : ""}`;

        // Make favorites clickable to re-search
        li.addEventListener("click", () => {
            wordInput.value = fav.word;
            handleSearch(new Event("submit"));
        });

        favoritesList.appendChild(li);
    });
}
