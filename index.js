// ===== Wordly Dictionary SPA =====

const API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const FAVORITES_KEY = "wordly_favorites";
const THEME_KEY = "wordly_theme";

// ---- Element references ----
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

// ---- State ----
let currentAudioUrl = null;
let currentAudio = null;
let currentWord = null;
let currentPhoneticText = "";

// =====================================================
// Initialization
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    displayFavorites();
    restoreTheme();
});

searchForm.addEventListener("submit", handleSearch);
audioBtn.addEventListener("click", playAudio);
favoriteBtn.addEventListener("click", toggleFavoriteForCurrentWord);
themeToggle.addEventListener("click", toggleTheme);

// =====================================================
// Search handling
// =====================================================
function handleSearch(event) {
    event.preventDefault();

    const rawValue = wordInput.value;
    const word = rawValue.trim().toLowerCase();

    clearErrors();

    if (!word) {
        displayError("Please enter a word.");
        return;
    }

    clearResults();
    setLoading(true);
    fetchWord(word);
}

async function fetchWord(word) {
    try {
        const response = await fetch(`${API_BASE}${encodeURIComponent(word)}`);

        if (!response.ok) {
            if (response.status === 404) {
                displayError("We could not find that word. Check the spelling and try again.");
            } else {
                displayError("Something went wrong while loading the definition. Please try again.");
            }
            return;
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0 || !data[0]) {
            displayError("Something went wrong while loading the definition. Please try again.");
            return;
        }

        displayWord(data[0]);
    } catch (err) {
        displayError("Something went wrong while loading the definition. Please try again.");
    } finally {
        setLoading(false);
    }
}

// =====================================================
// Display
// =====================================================
function displayWord(entry) {
    clearResults();

    currentWord = entry.word || wordInput.value.trim();
    currentPhoneticText = getPhoneticText(entry);
    currentAudioUrl = getAudioUrl(entry);

    resultWord.textContent = currentWord;
    resultPhonetic.textContent = currentPhoneticText;

    // Audio button
    if (currentAudioUrl) {
        audioBtn.classList.remove("hidden");
        currentAudio = new Audio(currentAudioUrl);
    } else {
        audioBtn.classList.add("hidden");
        currentAudio = null;
    }

    // Meanings
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

    // Source link
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

function getPhoneticText(entry) {
    if (entry.phonetic) return entry.phonetic;

    const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
    const withText = phonetics.find((p) => p.text);
    return withText ? withText.text : "";
}

function getAudioUrl(entry) {
    const phonetics = Array.isArray(entry.phonetics) ? entry.phonetics : [];
    const withAudio = phonetics.find((p) => p.audio);
    return withAudio ? withAudio.audio : null;
}

function getSynonyms(meaning) {
    const meaningLevel = Array.isArray(meaning.synonyms) ? meaning.synonyms : [];
    const definitionLevel = Array.isArray(meaning.definitions)
        ? meaning.definitions.flatMap((def) => (Array.isArray(def.synonyms) ? def.synonyms : []))
        : [];

    const combined = [...meaningLevel, ...definitionLevel];
    return [...new Set(combined)];
}

function clearResults() {
    meaningsContainer.innerHTML = "";
    resultWord.textContent = "";
    resultPhonetic.textContent = "";
    sourceLink.classList.add("hidden");
    audioBtn.classList.add("hidden");
    resultCard.classList.add("hidden");
    currentAudio = null;
    currentAudioUrl = null;
}

function displayError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
}

function clearErrors() {
    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
}

function setLoading(isLoading) {
    loadingMessage.classList.toggle("hidden", !isLoading);
    searchBtn.disabled = isLoading;
}

// =====================================================
// Audio playback
// =====================================================
function playAudio() {
    if (!currentAudio) return;

    currentAudio.play().catch(() => {
        displayError("Audio could not be played right now.");
    });
}

// =====================================================
// Favorites (localStorage)
// =====================================================
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

function updateFavoriteButton() {
    if (!currentWord) return;

    const saved = isFavorite(currentWord);
    favoriteBtn.textContent = saved ? "★ Saved" : "☆ Save";
    favoriteBtn.classList.toggle("saved", saved);
    highlightActiveFavorite();
}

function displayFavorites() {
    const favorites = getFavorites();
    favoritesList.innerHTML = "";

    if (favorites.length === 0) {
        favoritesEmpty.classList.remove("hidden");
    } else {
        favoritesEmpty.classList.add("hidden");
    }

    favorites.forEach((fav) => {
        const item = document.createElement("li");
        item.className = "favorite-item";
        if (currentWord && currentWord.toLowerCase() === fav.word.toLowerCase()) {
            item.classList.add("active");
        }

        const wordBtn = document.createElement("button");
        wordBtn.className = "favorite-word-btn";
        wordBtn.type = "button";
        wordBtn.textContent = fav.word;
        wordBtn.setAttribute("aria-label", `Search again for ${fav.word}`);
        wordBtn.addEventListener("click", () => {
            wordInput.value = fav.word;
            searchForm.requestSubmit();
        });

        const removeBtn = document.createElement("button");
        removeBtn.className = "favorite-remove-btn";
        removeBtn.type = "button";
        removeBtn.textContent = "✕";
        removeBtn.setAttribute("aria-label", `Remove ${fav.word} from favorites`);
        removeBtn.addEventListener("click", () => {
            removeFavorite(fav.word);
            updateFavoriteButton();
        });

        item.appendChild(wordBtn);
        item.appendChild(removeBtn);
        favoritesList.appendChild(item);
    });
}

function highlightActiveFavorite() {
    const items = favoritesList.querySelectorAll(".favorite-item");
    items.forEach((item) => {
        const label = item.querySelector(".favorite-word-btn").textContent;
        item.classList.toggle(
            "active",
            currentWord && label.toLowerCase() === currentWord.toLowerCase()
        );
    });
}

// =====================================================
// Theme toggle
// =====================================================
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
