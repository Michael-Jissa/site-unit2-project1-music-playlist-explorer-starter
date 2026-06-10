// Featured page DOM targets for playlist hero and song list.
const featuredCover = document.querySelector(".featured-cover");
const featuredTitle = document.querySelector(".featured-title");
const featuredCreator = document.querySelector(".featured-creator");
const featuredDescription = document.querySelector(".featured-description");
const featuredSongList = document.querySelector(".featured-song-list");

// Pick one playlist at random for this page load.
function selectRandomPlaylist(playlists) {
  if (!Array.isArray(playlists) || playlists.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * playlists.length);
  return playlists[randomIndex];
}

// Build one song row for the featured track list.
function buildFeaturedSongMarkup(song) {
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

// Render selected featured playlist into left/right featured layout.
function renderFeaturedPlaylist(playlist) {
  if (!playlist) return;
  if (!featuredCover || !featuredTitle || !featuredCreator || !featuredDescription || !featuredSongList) return;

  featuredCover.src = playlist.coverImageUrl;
  featuredCover.alt = `${playlist.title} cover`;
  featuredTitle.textContent = playlist.title;
  featuredCreator.textContent = `Created by ${playlist.creator}`;
  featuredDescription.textContent = playlist.description || "No description available.";

  const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
  featuredSongList.innerHTML = songs.map((song) => buildFeaturedSongMarkup(song)).join("");
}

// Load playlist data and show one random featured playlist.
async function loadFeaturedPlaylist() {
  try {
    const response = await fetch("./data.json");
    if (!response.ok) {
      throw new Error(`Failed to fetch data.json (${response.status})`);
    }

    const playlists = await response.json();
    const randomPlaylist = selectRandomPlaylist(playlists);
    renderFeaturedPlaylist(randomPlaylist);
  } catch (error) {
    console.error("Could not load featured playlist.", error);
  }
}

// App bootstrap for Featured page.
loadFeaturedPlaylist();
