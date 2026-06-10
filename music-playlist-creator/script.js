// Grab key page elements used by the All Playlists experience.
const playlistCardsContainer = document.querySelector(".playlist-cards");
const modalOverlay = document.querySelector(".modal-overlay");
const modalContent = document.querySelector(".modal-content");
const modalCover = document.querySelector(".modal-cover");
const modalTitle = document.querySelector(".modal-playlist-meta h2");
const modalCreator = document.querySelector(".modal-playlist-meta .modal-creator");
const songList = document.querySelector(".song-list");
const shuffleButton = document.querySelector(".shuffle-button");
const generateDescriptionButton = document.querySelector(".generate-description-button");
const aiDescriptionText = document.querySelector(".ai-description-text");
const addPlaylistButton = document.querySelector(".add-playlist-button");
const addSongButton = document.querySelector(".add-song-button");
const headerSearchInput = document.querySelector(".header-search-input");
const dataFormOverlay = document.querySelector(".data-form-overlay");
const dataFormTitle = document.querySelector(".data-form-title");
const dataForm = document.querySelector(".data-form");
const dataFormFields = document.querySelector(".data-form-fields");
const dataFormError = document.querySelector(".data-form-error");
const dataFormSubmit = document.querySelector(".data-form-submit");
const dataFormCancel = document.querySelector(".data-form-cancel");

// Shared in-memory state for current playlists, modal context, and UI settings.
let playlistsStore = [];
let currentModalPlaylistId = null;
let currentModalSongs = [];
let currentModalPlaylist = null;
let promptTemplateCache = null;
let typingTimerId = null;
const PLAYLIST_STORAGE_KEY = "music-playlist-explorer-playlists";
let currentSearchQuery = "";
let dataFormResolve = null;

// Build one playlist card shown in the main gallery grid.
function buildPlaylistCardMarkup(playlist) {
  const isLiked = Boolean(playlist.userHasLiked);

  return `
    <article class="playlist-card" data-playlist-id="${playlist.id}">
      <button
        type="button"
        class="edit-playlist-button"
        data-playlist-id="${playlist.id}"
        aria-label="Edit playlist ${playlist.title}"
      >
        Edit
      </button>
      <div class="edit-action-menu" data-playlist-id="${playlist.id}">
        <button type="button" class="edit-action-button" data-action="edit" data-playlist-id="${playlist.id}">Edit</button>
        <button type="button" class="edit-action-button delete" data-action="delete" data-playlist-id="${playlist.id}">Delete</button>
      </div>
      <img
        src="${playlist.coverImageUrl}"
        alt="${playlist.title} cover"
        class="playlist-card-cover"
      >
      <div class="playlist-card-details">
        <h3 class="playlist-title">${playlist.title}</h3>
        <p class="playlist-author">Created by ${playlist.creator}</p>
        <div class="playlist-likes">
          <button
            type="button"
            class="like-button ${isLiked ? "is-liked" : ""}"
            data-playlist-id="${playlist.id}"
            aria-label="Toggle like for ${playlist.title}"
            aria-pressed="${isLiked}"
          >
            <span aria-hidden="true">❤</span>
          </button>
          <span>Likes: <span class="like-count">${playlist.likes}</span></span>
        </div>
      </div>
    </article>
  `;
}

// Render all playlist cards into the `.playlist-cards` container.
function renderPlaylists(playlists) {
  if (!playlistCardsContainer) return;

  playlistCardsContainer.innerHTML = playlists
    .map((playlist) => buildPlaylistCardMarkup(playlist))
    .join("");
}

// Return playlists matching the lowercase search query (title or creator).
function getFilteredPlaylists() {
  const query = currentSearchQuery.trim().toLowerCase();
  if (!query) return playlistsStore;

  return playlistsStore.filter((playlist) => {
    const title = String(playlist.title || "").toLowerCase();
    const creator = String(playlist.creator || "").toLowerCase();
    return title.includes(query) || creator.includes(query);
  });
}

// Render current search results in the gallery.
function renderFilteredPlaylists() {
  renderPlaylists(getFilteredPlaylists());
}

// Build one song row used in modal/featured song lists.
function buildSongItemMarkup(song) {
  const songDuration = song.duration || song.length || "0:00";

  return `
    <li class="song-item">
      <img src="${song.coverImageUrl}" alt="${song.title} cover" class="song-cover">
      <div class="song-meta">
        <h3>${song.title}</h3>
        <p>${song.artist}</p>
      </div>
      <span class="song-duration">${songDuration}</span>
    </li>
  `;
}

// Replace modal song list with provided songs.
function renderModalSongs(songs) {
  if (!songList) return;
  songList.innerHTML = songs.map((song) => buildSongItemMarkup(song)).join("");
}

// Persist current playlist data for this browser session.
function savePlaylistsToStorage() {
  localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlistsStore));
}

// Calculate next playlist id in ascending order.
function getNextPlaylistId() {
  return playlistsStore.reduce((maxId, playlist) => Math.max(maxId, Number(playlist.id) || 0), 0) + 1;
}

// Calculate next song id across every playlist.
function getNextSongId() {
  return playlistsStore.reduce((maxSongId, playlist) => {
    const playlistMax = (playlist.songs || []).reduce(
      (songMax, song) => Math.max(songMax, Number(song.id) || 0),
      0
    );
    return Math.max(maxSongId, playlistMax);
  }, 0) + 1;
}

// Opens one popup form that collects all required fields at once for add/edit flows.
function openDataForm({ title, submitLabel, fields }) {
  return new Promise((resolve) => {
    if (
      !dataFormOverlay ||
      !dataFormTitle ||
      !dataForm ||
      !dataFormFields ||
      !dataFormError ||
      !dataFormSubmit
    ) {
      resolve(null);
      return;
    }

    dataFormResolve = resolve;
    dataFormTitle.textContent = title;
    dataFormSubmit.textContent = submitLabel;
    dataFormError.textContent = "";
    dataFormFields.innerHTML = fields
      .map(
        (field) => `
          <div class="data-form-group">
            <label for="data-form-${field.name}">${field.label}</label>
            ${
              field.type === "textarea"
                ? `<textarea id="data-form-${field.name}" name="${field.name}" placeholder="${field.placeholder || ""}" ${field.required ? "required" : ""}>${field.value || ""}</textarea>`
                : `<input id="data-form-${field.name}" type="${field.type || "text"}" name="${field.name}" value="${field.value || ""}" placeholder="${field.placeholder || ""}" ${field.required ? "required" : ""}>`
            }
          </div>
        `
      )
      .join("");

    dataForm.dataset.fields = JSON.stringify(fields.map((field) => field.name));
    dataFormOverlay.classList.add("is-open");
    dataFormOverlay.setAttribute("aria-hidden", "false");
  });
}

// Closes data popup form and resolves the pending promise.
function closeDataForm(result = null) {
  if (!dataFormOverlay) return;
  dataFormOverlay.classList.remove("is-open");
  dataFormOverlay.setAttribute("aria-hidden", "true");
  if (dataFormResolve) {
    const resolver = dataFormResolve;
    dataFormResolve = null;
    resolver(result);
  }
}

// Converts user-entered songs JSON into normalized song objects.
function parseSongsJson(songsJsonText) {
  try {
    const parsedSongs = JSON.parse(songsJsonText);
    if (!Array.isArray(parsedSongs) || parsedSongs.length === 0) return null;

    const normalizedSongs = parsedSongs.map((song) => ({
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration || song.length,
      length: song.duration || song.length,
      coverImageUrl: song.coverImageUrl,
    }));

    const hasInvalidSong = normalizedSongs.some(
      (song) => !song.title || !song.artist || !song.album || !song.duration || !song.coverImageUrl
    );
    if (hasInvalidSong) return null;
    return normalizedSongs;
  } catch {
    return null;
  }
}

// Add new playlist from one form popup, enforce default likes/isFeatured values, then re-render.
async function handleAddPlaylistClick() {
  const playlistFormData = await openDataForm({
    title: "Add Playlist",
    submitLabel: "Add Playlist",
    fields: [
      { name: "title", label: "Playlist title", required: true, placeholder: "Chill Nights" },
      { name: "creator", label: "Creator", required: true, placeholder: "Creator Name" },
      { name: "coverImageUrl", label: "Playlist cover image URL", required: true, placeholder: "https://..." },
      { name: "description", label: "Description", required: true, placeholder: "Short playlist summary" },
      {
        name: "songsJson",
        label: "Songs JSON array",
        type: "textarea",
        required: true,
        placeholder:
          '[{"title":"Song A","artist":"Artist","album":"Album","duration":"3:20","coverImageUrl":"https://..."}]',
      },
    ],
  });

  if (!playlistFormData) return;

  const songs = parseSongsJson(playlistFormData.songsJson);
  if (!songs) {
    alert("Songs JSON is invalid. Please provide an array of songs with title, artist, album, duration, and coverImageUrl.");
    return;
  }

  let nextSongId = getNextSongId();
  const songsWithIds = songs.map((song) => {
    const songWithId = {
      id: nextSongId,
      ...song,
    };
    nextSongId += 1;
    return songWithId;
  });

  const newPlaylist = {
    id: getNextPlaylistId(),
    title: playlistFormData.title,
    creator: playlistFormData.creator,
    coverImageUrl: playlistFormData.coverImageUrl,
    description: playlistFormData.description,
    likes: 0,
    isFeatured: true,
    songs: songsWithIds,
  };

  playlistsStore.push(newPlaylist);
  savePlaylistsToStorage();
  renderFilteredPlaylists();
}

// Add one song from a single popup form and update modal immediately.
async function handleAddSongClick() {
  if (!currentModalPlaylist) return;
  const songFormData = await openDataForm({
    title: "Add Song",
    submitLabel: "Add Song",
    fields: [
      { name: "title", label: "Song title", required: true, placeholder: "Song Title" },
      { name: "artist", label: "Artist", required: true, placeholder: "Artist Name" },
      { name: "album", label: "Album", required: true, placeholder: "Album Name" },
      { name: "duration", label: "Duration (mm:ss)", required: true, placeholder: "3:45" },
      { name: "coverImageUrl", label: "Song cover image URL", required: true, placeholder: "https://..." },
    ],
  });
  if (!songFormData) return;

  const targetPlaylist = playlistsStore.find((playlist) => playlist.id === currentModalPlaylist.id);
  if (!targetPlaylist) return;

  const songWithId = {
    id: getNextSongId(),
    title: songFormData.title,
    artist: songFormData.artist,
    album: songFormData.album,
    duration: songFormData.duration,
    length: songFormData.duration,
    coverImageUrl: songFormData.coverImageUrl,
  };
  targetPlaylist.songs = [...(targetPlaylist.songs || []), songWithId];

  currentModalPlaylist = targetPlaylist;
  currentModalSongs = [...targetPlaylist.songs];
  renderModalSongs(currentModalSongs);
  savePlaylistsToStorage();
}

// Edit existing playlist fields via one popup form and refresh card + modal views.
async function handleEditPlaylistClick(playlistId) {
  const playlist = playlistsStore.find((item) => item.id === playlistId);
  if (!playlist) return;
  const updatedFormData = await openDataForm({
    title: "Edit Playlist",
    submitLabel: "Save Changes",
    fields: [
      { name: "title", label: "Playlist title", required: true, value: playlist.title },
      { name: "creator", label: "Creator", required: true, value: playlist.creator },
      { name: "coverImageUrl", label: "Playlist cover image URL", required: true, value: playlist.coverImageUrl },
      { name: "description", label: "Description", required: true, value: playlist.description || "" },
    ],
  });
  if (!updatedFormData) return;

  Object.assign(playlist, {
    title: updatedFormData.title,
    creator: updatedFormData.creator,
    coverImageUrl: updatedFormData.coverImageUrl,
    description: updatedFormData.description,
  });
  savePlaylistsToStorage();
  renderFilteredPlaylists();

  if (currentModalPlaylistId === playlistId) {
    populateModalFromPlaylist(playlist);
  }
}

// Delete a playlist after confirmation and close modal if it was open.
function handleDeletePlaylistClick(playlistId) {
  const playlist = playlistsStore.find((item) => item.id === playlistId);
  if (!playlist) return;

  const confirmed = confirm(`Delete playlist "${playlist.title}"? This cannot be undone.`);
  if (!confirmed) return;

  playlistsStore = playlistsStore.filter((item) => item.id !== playlistId);
  savePlaylistsToStorage();
  renderFilteredPlaylists();
  if (currentModalPlaylistId === playlistId) {
    closePlaylistModal();
  }
}

// Close any open edit action popovers in card UI.
function closeAllEditActionMenus() {
  document.querySelectorAll(".edit-action-menu.is-open").forEach((menu) => {
    menu.classList.remove("is-open");
  });
}

// Populate modal with selected playlist details and songs.
function populateModalFromPlaylist(playlist) {
  if (!playlist || !modalCover || !modalTitle || !modalCreator || !songList) return;

  modalCover.src = playlist.coverImageUrl;
  modalCover.alt = `${playlist.title} cover`;
  modalTitle.textContent = playlist.title;
  modalCreator.textContent = `Created by ${playlist.creator}`;

  currentModalPlaylistId = playlist.id;
  currentModalPlaylist = playlist;
  currentModalSongs = Array.isArray(playlist.songs) ? [...playlist.songs] : [];
  renderModalSongs(currentModalSongs);
  setAiDescriptionText('Click "Generate Description" to create an AI summary for this playlist.');
}

// Open modal overlay for selected playlist.
function openPlaylistModal(playlist) {
  if (!modalOverlay) return;
  populateModalFromPlaylist(playlist);
  modalOverlay.classList.add("is-open");
}

// Close modal and clear temporary modal state.
function closePlaylistModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove("is-open");
  currentModalPlaylistId = null;
  currentModalPlaylist = null;
  currentModalSongs = [];
  if (typingTimerId) {
    window.clearTimeout(typingTimerId);
    typingTimerId = null;
  }
}

// Set text in AI description panel under modal header.
function setAiDescriptionText(text) {
  if (!aiDescriptionText) return;
  aiDescriptionText.textContent = text;
}

// Typewriter effect for AI description text reveal.
function typeTextIntoElement(element, text, speedMs = 18) {
  if (!element) return;
  if (typingTimerId) {
    window.clearTimeout(typingTimerId);
    typingTimerId = null;
  }

  element.textContent = "";
  let index = 0;

  const typeNext = () => {
    if (index >= text.length) {
      typingTimerId = null;
      return;
    }

    element.textContent += text[index];
    index += 1;
    typingTimerId = window.setTimeout(typeNext, speedMs);
  };

  typeNext();
}

// Load prompt template once from prompt.txt and cache it.
async function loadPromptTemplate() {
  if (typeof promptTemplateCache === "string") {
    return promptTemplateCache;
  }

  const response = await fetch("./prompt.txt");
  if (!response.ok) {
    throw new Error("Could not load prompt.txt.");
  }

  promptTemplateCache = await response.text();
  return promptTemplateCache;
}

// Build AI prompt context from playlist + song data.
function buildPlaylistContext(playlist) {
  const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
  const songLines = songs
    .map((song, index) => {
      const duration = song.duration || song.length || "0:00";
      return `${index + 1}. ${song.title} - ${song.artist} (${duration})`;
    })
    .join("\n");

  return [
    `Playlist title: ${playlist.title}`,
    `Created by: ${playlist.creator}`,
    `Description: ${playlist.description || "N/A"}`,
    `Likes: ${playlist.likes}`,
    "Songs:",
    songLines,
  ].join("\n");
}

// Call OpenAI API and return generated short description text.
async function requestAiDescription(playlist) {
  if (typeof API_key !== "string" || !API_key.trim()) {
    throw new Error("Missing API_key in secret.js");
  }

  const promptTemplate = await loadPromptTemplate();
  const playlistContext = buildPlaylistContext(playlist);
  const userPrompt = `${promptTemplate.trim()}\n\n${playlistContext}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: "You are a music assistant. Respond with one short paragraph under 90 words.",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data?.choices?.[0]?.message?.content?.trim();

  if (!generatedText) {
    throw new Error("No AI text returned.");
  }

  return generatedText;
}

// Handle Generate Description button state + API lifecycle.
async function handleGenerateDescriptionClick() {
  if (!currentModalPlaylist) return;

  if (generateDescriptionButton) {
    generateDescriptionButton.disabled = true;
  }
  setAiDescriptionText("Generating description...");

  try {
    const generatedText = await requestAiDescription(currentModalPlaylist);
    typeTextIntoElement(aiDescriptionText, generatedText);
  } catch (error) {
    console.error("Could not generate AI description.", error);
    setAiDescriptionText("Could not generate description. Check prompt.txt, secret.js, and your API key.");
  } finally {
    if (generateDescriptionButton) {
      generateDescriptionButton.disabled = false;
    }
  }
}

// Shuffle songs without mutating original input array.
function shuffleSongs(songs) {
  const shuffledSongs = [...songs];

  for (let i = shuffledSongs.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffledSongs[i], shuffledSongs[randomIndex]] = [shuffledSongs[randomIndex], shuffledSongs[i]];
  }

  return shuffledSongs;
}

// Compare order by song ids to avoid showing unchanged shuffle result.
function songsHaveSameOrder(firstSongs, secondSongs) {
  if (firstSongs.length !== secondSongs.length) return false;
  return firstSongs.every((song, index) => song.id === secondSongs[index].id);
}

// Shuffle button handler for modal song list.
function handleShuffleClick() {
  if (!currentModalPlaylistId || currentModalSongs.length < 2) return;

  let shuffled = shuffleSongs(currentModalSongs);
  let tries = 0;

  while (songsHaveSameOrder(shuffled, currentModalSongs) && tries < 4) {
    shuffled = shuffleSongs(currentModalSongs);
    tries += 1;
  }

  currentModalSongs = shuffled;
  renderModalSongs(currentModalSongs);
}

// Toggle one playlist like state and update card count/heart UI.
function togglePlaylistLike(playlistId) {
  const playlist = playlistsStore.find((item) => item.id === playlistId);
  if (!playlist) return;

  const currentlyLiked = Boolean(playlist.userHasLiked);
  playlist.userHasLiked = !currentlyLiked;

  if (playlist.userHasLiked) {
    playlist.likes += 1;
  } else {
    playlist.likes = Math.max(0, playlist.likes - 1);
  }

  const card = playlistCardsContainer?.querySelector(
    `.playlist-card[data-playlist-id="${playlistId}"]`
  );
  if (!card) return;

  const likeCount = card.querySelector(".like-count");
  const likeButton = card.querySelector(".like-button");

  if (likeCount) {
    likeCount.textContent = String(playlist.likes);
  }

  if (likeButton) {
    likeButton.classList.toggle("is-liked", playlist.userHasLiked);
    likeButton.setAttribute("aria-pressed", String(playlist.userHasLiked));
  }
}

// Register all click/input listeners for cards, modal, edit menu, and search.
function attachModalEvents() {
  if (!playlistCardsContainer || !modalOverlay) return;

  playlistCardsContainer.addEventListener("click", (event) => {
    const actionButton = event.target.closest(".edit-action-button");
    if (actionButton) {
      const playlistId = Number(actionButton.dataset.playlistId);
      const action = actionButton.dataset.action;
      closeAllEditActionMenus();
      if (action === "edit" && !Number.isNaN(playlistId)) {
        handleEditPlaylistClick(playlistId);
      }
      if (action === "delete" && !Number.isNaN(playlistId)) {
        handleDeletePlaylistClick(playlistId);
      }
      return;
    }

    const editButton = event.target.closest(".edit-playlist-button");
    if (editButton) {
      event.stopPropagation();
      const playlistId = Number(editButton.dataset.playlistId);
      if (!Number.isNaN(playlistId)) {
        const card = editButton.closest(".playlist-card");
        const menu = card?.querySelector(".edit-action-menu");
        if (menu) {
          const opening = !menu.classList.contains("is-open");
          closeAllEditActionMenus();
          if (opening) {
            menu.classList.add("is-open");
          }
        }
      }
      return;
    }

    const likeButton = event.target.closest(".like-button");
    if (likeButton) {
      const playlistId = Number(likeButton.dataset.playlistId);
      if (!Number.isNaN(playlistId)) {
        togglePlaylistLike(playlistId);
      }
      return;
    }

    const clickedCard = event.target.closest(".playlist-card");
    if (!clickedCard) return;

    const playlistId = Number(clickedCard.dataset.playlistId);
    const selectedPlaylist = playlistsStore.find((playlist) => playlist.id === playlistId);
    if (!selectedPlaylist) return;

    openPlaylistModal(selectedPlaylist);
  });

  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      closePlaylistModal();
    }
  });

  if (modalContent) {
    modalContent.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  if (shuffleButton) {
    shuffleButton.addEventListener("click", handleShuffleClick);
  }

  if (generateDescriptionButton) {
    generateDescriptionButton.addEventListener("click", handleGenerateDescriptionClick);
  }

  if (addPlaylistButton) {
    addPlaylistButton.addEventListener("click", handleAddPlaylistClick);
  }

  if (addSongButton) {
    addSongButton.addEventListener("click", handleAddSongClick);
  }

  if (headerSearchInput) {
    headerSearchInput.addEventListener("input", (event) => {
      currentSearchQuery = String(event.target.value || "").toLowerCase();
      renderFilteredPlaylists();
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".edit-playlist-button") && !event.target.closest(".edit-action-menu")) {
      closeAllEditActionMenus();
    }
  });

  if (dataForm && dataFormCancel) {
    dataForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!dataFormFields || !dataFormError) return;

      const fields = JSON.parse(dataForm.dataset.fields || "[]");
      const values = {};
      let invalidField = null;

      fields.forEach((fieldName) => {
        const input = dataFormFields.querySelector(`[name="${fieldName}"]`);
        const value = String(input?.value || "").trim();
        values[fieldName] = value;
        if (!invalidField && input?.hasAttribute("required") && !value) {
          invalidField = fieldName;
        }
      });

      if (invalidField) {
        dataFormError.textContent = "Please complete all required fields.";
        return;
      }

      closeDataForm(values);
    });

    dataFormCancel.addEventListener("click", () => closeDataForm(null));
  }

  if (dataFormOverlay) {
    dataFormOverlay.addEventListener("click", (event) => {
      if (event.target === dataFormOverlay) {
        closeDataForm(null);
      }
    });
  }
}

// Load playlists (JSON or localStorage override), then render and bind UI.
async function loadPlaylists() {
  const candidatePaths = [
    "./data.json",
    "../data/data.json",
    "./data/data.json",
    "/data/data.json",
  ];

  try {
    let playlists = null;

    for (const path of candidatePaths) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;

        playlists = await response.json();
        break;
      } catch (error) {
        // Try the next candidate path.
      }
    }

    if (!Array.isArray(playlists)) {
      throw new Error("No valid playlist JSON could be loaded from known paths.");
    }

    const savedPlaylists = localStorage.getItem(PLAYLIST_STORAGE_KEY);
    playlistsStore = savedPlaylists ? JSON.parse(savedPlaylists) : playlists;
    renderFilteredPlaylists();
    attachModalEvents();
  } catch (error) {
    console.error("Could not load playlists.", error);
  }
}

// App bootstrap for the All Playlists page.
loadPlaylists();
