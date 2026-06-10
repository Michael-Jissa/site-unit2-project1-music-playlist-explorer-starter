## Music Playlist Explorer — Planning Spec

### Data Shape
- `playlist`: `id`, `title`, `creator`, `coverImageUrl`, `likes`, `isFeatured`, `description`, `songs[]`
- `song`: `id`, `title`, `artist`, `album`, `duration`, `length`, `coverImageUrl`

### Current Features
- `index.html` shows all playlist cards from data.
- Card shows cover, title, `Created by`, like button + count.
- Card click opens modal with playlist cover/details and song list.
- Modal supports: shuffle songs, AI description generation, add song.
- Header supports: navigation (`Featured` / `All`) and search by playlist title or creator (lowercase matching).
- Featured page (`featured.html`) shows one random playlist and its songs on each load.
- Add/Edit/Delete playlist and Add song are supported in UI and persisted in `localStorage` (not direct file writes).

### Core Function Specs
- `renderPlaylists(playlists)`: render playlist cards into `.playlist-cards`.
- `populateModalFromPlaylist(playlist)`: update modal cover/title/creator/songs for selected playlist.
- `togglePlaylistLike(playlistId)`: toggle `userHasLiked`, increment/decrement `likes`, update card UI.
- `shuffleSongs(songs)`: return shuffled copy of songs array (original playlist order preserved).
- `selectRandomPlaylist(playlists)`: return one random playlist for Featured page.
