# ScreenScape Player Integration Documentation

## Overview

**Player Name:** ScreenScape

ScreenScape is an embedded streaming player that supports Movies and TV Shows using either TMDB IDs or IMDb IDs. It also provides Watch History and Playback Progress APIs through `window.postMessage`.

---

# Base URL

```
https://nxsha.screenscape.me/embed
```

---

# Supported Content

- Movies
- TV Shows
- Anime (if available on TMDB)

---

# Movie Embed

## Using TMDB ID

```
https://nxsha.screenscape.me/embed?tmdb={TMDB_ID}&type=movie
```

Example

```
https://nxsha.screenscape.me/embed?tmdb=10195&type=movie
```

---

## Movie with Preferred Language

```
https://nxsha.screenscape.me/embed?tmdb={TMDB_ID}&type=movie&lan={LANGUAGE}
```

Example

```
https://nxsha.screenscape.me/embed?tmdb=597&type=movie&lan=eng
```

---

# TV Show Embed

```
https://nxsha.screenscape.me/embed?tmdb={TMDB_ID}&type=tv&s={SEASON}&e={EPISODE}
```

Example

```
https://nxsha.screenscape.me/embed?tmdb=1396&type=tv&s=1&e=1
```

---

## TV Show with Language

```
https://nxsha.screenscape.me/embed?tmdb={TMDB_ID}&type=tv&s={SEASON}&e={EPISODE}&lan={LANGUAGE}
```

Example

```
https://nxsha.screenscape.me/embed?tmdb=1396&type=tv&s=1&e=1&lan=eng
```

---

# IMDb Support

## Movie

```
https://nxsha.screenscape.me/embed?imdb={IMDB_ID}&type=movie
```

Example

```
https://nxsha.screenscape.me/embed?imdb=tt0800369&type=movie
```

---

## TV Show

```
https://nxsha.screenscape.me/embed?imdb={IMDB_ID}&type=tv&s={SEASON}&e={EPISODE}
```

Example

```
https://nxsha.screenscape.me/embed?imdb=tt14490706&type=tv&s=1&e=1
```

ScreenScape automatically resolves IMDb IDs into TMDB IDs internally.

---

# Query Parameters

| Parameter | Required | Description |
|------------|----------|-------------|
| tmdb | Yes* | TMDB ID |
| imdb | Yes* | IMDb ID (Use either tmdb or imdb) |
| type | Yes | movie or tv |
| s | TV Only | Season Number |
| e | TV Only | Episode Number |
| lan | Optional | Preferred Audio Language |

Supported language examples

```
eng
hindi
french
japanese
korean
```

Default behavior

- If Hindi audio is available, ScreenScape prefers Hindi automatically.

---

# iframe Embed

```html
<iframe
    src="EMBED_URL"
    width="100%"
    height="100%"
    frameborder="0"
    allowfullscreen
    allow="autoplay; fullscreen; picture-in-picture">
</iframe>
```

---

# Watch History & Progress API

Communication method

```
window.postMessage()
```

Supported Requests

```
SCREENSCAPE_GET_WATCH_HISTORY

SCREENSCAPE_GET_WATCH_HISTORY_WITH_PROGRESS

SCREENSCAPE_GET_ALL_WATCH_HISTORY_DETAILED

SCREENSCAPE_GET_PROGRESS

SCREENSCAPE_SET_PROGRESS
```

Response Event

```
SCREENSCAPE_WATCH_HISTORY_WITH_PROGRESS_RESPONSE
```

Capabilities

- Get Watch History
- Get Detailed Watch History
- Get Playback Progress
- Save Playback Progress
- Resume Playback

---

# AI Implementation Rules

## Movie

Required

```
tmdb OR imdb

type=movie
```

---

## TV

Required

```
tmdb OR imdb

type=tv

s

e
```

---

## Language

Only append

```
lan=<language>
```

when the user explicitly selects a preferred language.

Otherwise omit the parameter.

---

# Backend Integration (Recommended)

Flow

```
Frontend

↓

GET /api/player/movie/:tmdbId

↓

Backend

↓

Construct ScreenScape Embed URL

↓

Return Embed URL

↓

Frontend renders iframe
```

Never hardcode embed URLs inside the frontend.

---

# Error Handling

If ScreenScape fails

```
Try Next Player

↓

VidCore

↓

Vares

↓

VidSuper

↓

VidFast

↓

VidRock
```

Backend should automatically switch to the next player.

---

# Best Practices

- Store the base URL in backend environment variables.
- Generate embed URLs only on the backend.
- Prefer TMDB IDs.
- Use IMDb IDs as fallback.
- Do not expose player selection logic to the frontend.
- Automatically retry another player if ScreenScape is unavailable.

---

# Summary

✅ Movies

✅ TV Shows

✅ TMDB IDs

✅ IMDb IDs

✅ Language Support

✅ Watch History API

✅ Progress API

✅ iframe Embed

✅ Backend Friendly

✅ Automatic Fallback Compatible