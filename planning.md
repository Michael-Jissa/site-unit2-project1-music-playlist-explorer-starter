```
## Music Playlist Explorer — Planning Spec

### Data Shape
playlist:
  - id (number) — unique identifier for the playlist.
  - title (string) — playlist name shown on cards and modal.
  - creator (string) — name of the user/curator who made the playlist.
  - coverImageUrl (string) — image URL used as the playlist cover.
  - likes (number) — current like count shown on the playlist card.
  - isFeatured (boolean) — marks whether playlist appears in Featured view.
  - description (string) — short summary shown in modal details.
  - songs (array<song>) — ordered list of song objects in this playlist.

song:
  - id (number) — unique identifier for the song.
  - title (string) — song title shown in the song list.
  - artist (string) — primary artist name shown under the title.
  - album (string) — album name shown in song metadata.
  - duration (string) — track length in mm:ss format for display.
  - coverImageUrl (string) — song thumbnail shown in the modal list.

### UI and Interaction Rules
The home page should be a simple page with an aesthetic look. On the top left should be the title of the page and on the right shoulfd be two tabs, featured and all. Below that is the main body section. It should be visually distinct from the navigation + header. Then the body should contain rows of cards with curved edges. A desktop screen should have display 2 rows of 4 cards. Each card should contain a cover image of the playlist, name of the song, created by,and like count with the like symbol. Clicking a playlist will make a playlist pop up with a cover image with the name and details, a button to shuffle, a list of the songs with their names and details, the length of the music on the right side of the song's card with a scroll-down. The featured tab should contain a plalist (a list of songs on the right and a big cover image of the playlist on the left.) The shuffle butten should rearrange the songs. Clicking the like button should light the heart red and incriment the count.

More details about styling: I want the page to look, dynamic, inviting and fun with responsive animation. Hoovering at any card should create a hovering effect. The cards should also have a shaddow effect. The modal overlay should occupy a good amount of the screen when a playlist is clicked. When it pops, the background should be blurred. Playlist cards should also have half borders that only appear upon hovering. The modal overview. The shuffle button should have a deeper hue color upon hovering. The texts on the navigation tabs should also change in color when hoverd on. Clicking a playlist should make the modular-overlay pop up with a smooth animation. The Featured tab should havre a similar layout but look but the layout hould be more like a modular-overlay but with the whole screem. It should hilight one playlist.
The color pallet should be the following: dark gray (mostly for balnk spaces), black (mostly for balnk spaces), dark hue green/light hue green (mostly for buttons), black (mostly for strips and bars)

### Function Specs
[Add function specs here as you plan each milestone]

### AI Feature Spec (Milestone 8)
[Leave blank — fill in before Milestone 8]

### Decisions Log
[One entry per milestone where you make spec-informed decisions]
```

