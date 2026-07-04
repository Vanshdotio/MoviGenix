# VidSuper Player Integration Documentation

## Overview

**Player Name:** VidSuper

VidSuper is an embedded streaming player that supports Movies and TV Shows using **TMDB IDs**. It provides autoplay, playback resume, Netflix-style overlay, episode selector, next episode support, and playback events using `window.postMessage`.

---

# Base URL

```
https://vidsuper.net
```

---

# Supported Content

- Movies
- TV Shows
- Anime (if available on TMDB)

---

# Supported IDs

VidSuper only supports

```
TMDB IDs
```

IMDb IDs are **not supported**.

---

# Movie Endpoint

```
GET

https://vidsuper.net/movie/{TMDB_ID}
```

Example

```
https://vidsuper.net/movie/299534
```

---

# TV Endpoint

```
GET

https://vidsuper.net/tv/{TMDB_ID}/{SEASON}/{EPISODE}
```

Example

```
https://vidsuper.net/tv/1399/1/1
```

---

# Movie Query Parameters

| Parameter | Required | Description |
|------------|----------|-------------|
| color | Optional | Player accent color (HEX without #) |
| autoplay | Optional | Automatically start playback |
| progress | Optional | Resume playback from seconds |
| overlay | Optional | Netflix-style pause overlay |
| skip_intro | Optional | Enable Skip Intro / Skip Recap |

---

# TV Query Parameters

| Parameter | Required | Description |
|------------|----------|-------------|
| color | Optional | Player accent color |
| autoplay | Optional | Auto play episode |
| progress | Optional | Resume playback |
| nextEpisode | Optional | Show Next Episode button |
| autoplayNextEpisode | Optional | Automatically play next episode |
| episodeSelector | Optional | Enable season & episode selector |
| overlay | Optional | Netflix-style overlay |
| skip_intro | Optional | Skip Intro / Skip Recap |

---

# Movie Examples

Basic

```
https://vidsuper.net/movie/299534
```

Autoplay

```
https://vidsuper.net/movie/299534?autoplay=true
```

Theme

```
https://vidsuper.net/movie/299534?color=8B5CF6
```

Resume Playback

```
https://vidsuper.net/movie/299534?progress=120
```

Everything

```
https://vidsuper.net/movie/299534?autoplay=true&progress=120&overlay=true&skip_intro=true&color=8B5CF6
```

---

# TV Examples

Basic

```
https://vidsuper.net/tv/1399/1/1
```

Autoplay

```
https://vidsuper.net/tv/1399/1/1?autoplay=true
```

Next Episode

```
https://vidsuper.net/tv/1399/1/1?nextEpisode=true
```

Auto Next Episode

```
https://vidsuper.net/tv/1399/1/1?autoplayNextEpisode=true
```

Episode Selector

```
https://vidsuper.net/tv/1399/1/1?episodeSelector=true
```

Everything Enabled

```
https://vidsuper.net/tv/1399/1/1?autoplay=true&nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&skip_intro=true&color=8B5CF6
```

---

# iframe Embed

```html
<iframe
    src="EMBED_URL"
    width="100%"
    height="100%"
    frameborder="0"
    allowfullscreen
    allow="encrypted-media">
</iframe>
```

---

# Responsive Embed

```html
<div style="position:relative;padding-bottom:56.25%;height:0;">
    <iframe
        src="EMBED_URL"
        style="position:absolute;inset:0;width:100%;height:100%;"
        frameborder="0"
        allowfullscreen>
    </iframe>
</div>
```

---

# Playback Events

VidSuper communicates using

```
window.postMessage()
```

Supported Events

```
play

pause

timeupdate

ended
```

---

# Event Payload

Example

```json
{
    "id":299534,
    "type":"timeupdate",
    "progress":152,
    "duration":7200
}
```

For TV

```json
{
    "id":1399,
    "type":"timeupdate",
    "progress":540,
    "duration":3600,
    "season":1,
    "episode":1
}
```

---

# Useful Playback Data

Available

```
Current Progress

Duration

Season

Episode

TMDB ID
```

Can be stored in

- localStorage
- Backend Database
- Continue Watching API

---

# AI Implementation Rules

## Movie

Required

```
TMDB ID
```

Endpoint

```
/movie/{TMDB_ID}
```

---

## TV

Required

```
TMDB ID

Season

Episode
```

Endpoint

```
/tv/{TMDB_ID}/{SEASON}/{EPISODE}
```

---

## Optional Features

Support these whenever enabled by the user

- Autoplay
- Resume Playback
- Accent Color
- Episode Selector
- Next Episode
- Auto Next Episode
- Netflix-style Overlay
- Skip Intro
- Skip Recap

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

Generate VidSuper Embed URL

↓

Return Embed URL

↓

Frontend renders iframe
```

Never generate embed URLs directly inside the frontend.

---

# Continue Watching

Store

```
TMDB ID

Current Time

Duration

Season

Episode
```

This enables

- Resume Playback
- Continue Watching
- Watch History
- Recently Watched

---

# Error Handling

If VidSuper fails

```
Try Next Player

↓

VidFast

↓

VidRock
```

---

# Best Practices

- Store the VidSuper base URL in backend environment variables.
- Generate all embed URLs on the backend.
- Use only TMDB IDs.
- Save playback progress to your backend.
- Enable autoplay only when requested.
- Use episode selector only for TV content.
- Do not expose player selection logic to the frontend.
- Support automatic fallback to another player.

---

# Summary

✅ Movies

✅ TV Shows

✅ TMDB IDs

✅ Autoplay

✅ Resume Playback

✅ Accent Theme

✅ Netflix Overlay

✅ Skip Intro

✅ Skip Recap

✅ Episode Selector

✅ Next Episode

✅ Auto Next Episode

✅ Playback Events

✅ Continue Watching

✅ iframe Embed

✅ Backend Friendly

✅ Automatic Fallback Compatible