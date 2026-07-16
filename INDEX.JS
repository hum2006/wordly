// Run code only after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Grab the form and input elements
  const form = document.getElementById("searchForm");
  const input = document.getElementById("wordInput");

  // Grab result display elements
  const resultCard = document.getElementById("resultCard");
  const resultWord = document.getElementById("resultWord");
  const resultPhonetic = document.getElementById("resultPhonetic");
  const audioBtn = document.getElementById("audioBtn");
  const meaningsContainer = document.getElementById("meaningsContainer");
  const errorMessage = document.getElementById("errorMessage");
  const loadingMessage = document.getElementById("loadingMessage");

  // Handle form submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // stop page reload
    const word = input.value.trim();

    // If no word entered, show error
    if (!word) {
      showError("Please enter a word.");
      return;
    }

    // Show loading message
    setLoading(true);
    clearError();
    clearResult();

    try {
      // Fetch from Free Dictionary API
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error("Word not found");

      const data = await res.json();
      displayWord(data[0]); // show first entry
    } catch (err) {
      showError("Could not find that word.");
    } finally {
      setLoading(false);
    }
  });

  // Display word details
  function displayWord(entry) {
    resultWord.textContent = entry.word || "";
    resultPhonetic.textContent = entry.phonetic || "";

    // Audio button
    const audioUrl = getAudioUrl(entry.phonetics);
    if (audioUrl) {
      audioBtn.classList.remove("hidden");
      audioBtn.onclick = () => new Audio(audioUrl).play();
    } else {
      audioBtn.classList.add("hidden");
    }

    // Meanings
    meaningsContainer.innerHTML = "";
    entry.meanings.forEach(meaning => {
      const part = document.createElement("h3");
      part.textContent = meaning.partOfSpeech;
      meaningsContainer.appendChild(part);

      meaning.definitions.forEach(def => {
        const defEl = document.createElement("p");
        defEl.textContent = def.definition;
        meaningsContainer.appendChild(defEl);

        if (def.example) {
          const exEl = document.createElement("p");
          exEl.textContent = `Example: ${def.example}`;
          meaningsContainer.appendChild(exEl);
        }
      });
    });

    resultCard.classList.remove("hidden");
  }

  // Helpers
  function getAudioUrl(phonetics) {
    if (!phonetics) return null;
    const audioObj = phonetics.find(p => p.audio);
    return audioObj ? audioObj.audio : null;
  }

  function showError(text) {
    errorMessage.textContent = text;
    errorMessage.classList.remove("hidden");
  }

  function clearError() {
    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
  }

  function setLoading(isLoading) {
    loadingMessage.classList.toggle("hidden", !isLoading);
  }

  function clearResult() {
    resultCard.classList.add("hidden");
    resultWord.textContent = "";
    resultPhonetic.textContent = "";
    meaningsContainer.innerHTML = "";
    audioBtn.classList.add("hidden");
  }
});
