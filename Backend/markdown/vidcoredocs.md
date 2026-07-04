# VidCore Player Integration Documentation

## Overview

**Player Name:** VidCore

VidCore is an embedded streaming player that supports Movies and TV Shows using either TMDB IDs or IMDb IDs. It supports autoplay, subtitles, custom themes, Chromecast, multiple servers, playback events, and progress tracking through `window.postMessage`.

---

# Base URL

```
https://vidcore.net
```

---

# Supported Content

- Movies
- TV Shows
- Anime (if available)
- TMDB IDs
- IMDb IDs

---

# Movie Endpoint

```
GET

https://vidcore.net/movie/{ID}
```

Where `{ID}` can be either:

- TMDB ID
- IMDb ID

Example

```
https://vidcore.net/movie/533535

https://vidcore.net/movie/tt6263850
```

---

# TV Endpoint

```
GET

https://vidcore.net/tv/{ID}/{SEASON}/{EPISODE}
```

Where

- ID = TMDB or IMDb
- Season = Season Number
- Episode = Episode Number

Example

```
https://vidcore.net/tv/63174/1/5

https://vidcore.net/tv/tt4052886/1/5
```

---

# Movie Query Parameters

| Parameter | Required | Description |
|------------|----------|-------------|
| title | Optional | Show movie title |
| poster | Optional | Show poster image |
| autoPlay | Optional | Auto play video |
| startAt | Optional | Start playback from given seconds |
| theme | Optional | Player theme color (HEX) |
| server | Optional | Default streaming server |
| hideServer | Optional | Hide server selection button |
| fullscreenButton | Optional | Show or hide fullscreen button |
| chromecast | Optional | Enable Chromecast |
| sub | Optional | Default subtitle language |

---

# TV Query Parameters

| Parameter | Required | Description |
|------------|----------|-------------|
| title | Optional | Show TV title |
| poster | Optional | Show poster |
| autoPlay | Optional | Auto play |
| startAt | Optional | Resume playback at seconds |
| theme | Optional | Player theme |
| nextButton | Optional | Show Next Episode button |
| autoNext | Optional | Automatically play next episode |
| server | Optional | Default streaming server |
| hideServer | Optional | Hide server selector |
| fullscreenButton | Optional | Show fullscreen button |
| chromecast | Optional | Enable Chromecast |
| sub | Optional | Subtitle language |

---

# Movie Examples

Basic

```
https://vidcore.net/movie/533535
```

IMDb

```
https://vidcore.net/movie/tt6263850
```

Autoplay

```
https://vidcore.net/movie/533535?autoPlay=true
```

Theme

```
https://vidcore.net/movie/533535?theme=16A085
```

Subtitle

```
https://vidcore.net/movie/533535?sub=en
```

Multiple Parameters

```
https://vidcore.net/movie/533535?autoPlay=true&theme=16A085&sub=en
```

---

# TV Examples

Basic

```
https://vidcore.net/tv/63174/1/5
```

IMDb

```
https://vidcore.net/tv/tt4052886/1/5
```

Auto Next

```
https://vidcore.net/tv/63174/1/5?nextButton=true&autoNext=true
```

Theme + Autoplay

```
https://vidcore.net/tv/63174/2/1?theme=16A085&autoPlay=true
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
        style="position:absolute;top:0;left:0;width:100%;height:100%;"
        frameborder="0"
        allowfullscreen
        allow="encrypted-media">
    </iframe>
</div>
```

---

# React Integration

```jsx
<VidCorePlayer
    id={tmdbId}
    type="movie"
/>

<VidCorePlayer
    id={tmdbId}
    type="tv"
    season={1}
    episode={5}
/>
```

---

# Playback Events

VidCore communicates using

```
window.postMessage()
```

Supported Events

```
play

pause

seeked

timeupdate

ended

playerstatus
```

---

# Event Data

Example

```json
{
    "type":"timeupdate",
    "data":{
        "currentTime":142.5,
        "duration":7200,
        "percent":0.02
    }
}
```

---

# Media Information Event

VidCore also sends

```json
{
    "mediaId":"533535",
    "mediaType":"movie"
}
```

For TV

```json
{
    "mediaId":"63174",
    "mediaType":"tv",
    "season":1,
    "episode":5
}
```

---

# Playback Progress

Useful Data

```
currentTime

duration

percent
```

Can be stored in

- localStorage
- Database
- Backend API

---

# AI Implementation Rules

## Movie

Required

```
ID

(type = movie)
```

ID can be

```
TMDB

or

IMDb
```

---

## TV

Required

```
ID

Season

Episode

(type = tv)
```

---

## Optional Features

Support the following whenever requested by the user

- Autoplay
- Resume Playback
- Theme Color
- Chromecast
- Subtitle Language
- Custom Server
- Hide Server Button
- Next Episode Button
- Auto Next Episode

---

# Backend Integration (Recommended)

Flow

```
Frontend

↓

GET /api/player/movie/:id

↓

Backend

↓

Generate VidCore URL

↓

Return Embed URL

↓

Frontend renders iframe
```

Never generate embed URLs inside the frontend.

---

# Progress Tracking

Backend may save

```
Current Time

Duration

Percentage

Season

Episode

Media ID
```

This allows

- Continue Watching
- Resume Playback
- Watch History
- Recently Watched

---

# Error Handling

If VidCore fails

```
Try Next Player

↓

Vares

↓

VidSuper

↓

VidFast

↓

VidRock
```

---

# Best Practices

- Generate embed URLs only on the backend.
- Store the VidCore base URL in backend environment variables.
- Accept both TMDB and IMDb IDs.
- Save playback progress to your backend database.
- Support automatic resume playback.
- Enable subtitles only when requested.
- Keep autoplay configurable.
- Do not expose player selection logic to the frontend.

---

# Summary

✅ Movies

✅ TV Shows

✅ TMDB IDs

✅ IMDb IDs

✅ Autoplay

✅ Resume Playback

✅ Playback Events

✅ Watch Progress

✅ Chromecast

✅ Subtitle Support

✅ Theme Support

✅ Next Episode

✅ Auto Next

✅ Multiple Servers

✅ iframe Embed

✅ Backend Friendly

✅ Automatic Fallback Compatible