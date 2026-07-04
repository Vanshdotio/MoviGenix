# VidFast Player Integration Documentation

## Overview

**Player Name:** VidFast

VidFast is an embedded streaming player supporting Movies and TV Shows using **TMDB IDs** or **IMDb IDs**. It provides autoplay, subtitles, custom themes, Chromecast, multiple servers, next episode support, and playback progress tracking through `window.postMessage`.

---

# Base URL

```
https://vidfast.pro
```

---

# Supported Content

- Movies
- TV Shows
- Anime (if available)
- TMDB IDs
- IMDb IDs

---

# Supported IDs

VidFast supports

```
TMDB IDs

IMDb IDs
```

---

# Movie Endpoint

```
GET

https://vidfast.pro/movie/{ID}
```

Where `{ID}` can be either

- TMDB ID
- IMDb ID

Example

```
https://vidfast.pro/movie/533535

https://vidfast.pro/movie/tt6263850
```

---

# TV Endpoint

```
GET

https://vidfast.pro/tv/{ID}/{SEASON}/{EPISODE}
```

Where

- ID = TMDB or IMDb
- Season = Season Number
- Episode = Episode Number

Example

```
https://vidfast.pro/tv/63174/1/5

https://vidfast.pro/tv/tt4052886/1/5
```

---

# Movie Query Parameters

| Parameter | Required | Description |
|------------|----------|-------------|
| title | Optional | Show media title |
| poster | Optional | Show poster image |
| autoPlay | Optional | Start playback automatically |
| startAt | Optional | Resume playback from seconds |
| theme | Optional | Player accent color (HEX) |
| server | Optional | Default streaming server |
| hideServer | Optional | Hide server selector |
| fullscreenButton | Optional | Show fullscreen button |
| chromecast | Optional | Enable Chromecast |
| sub | Optional | Default subtitle language |

---

# TV Query Parameters

| Parameter | Required | Description |
|------------|----------|-------------|
| title | Optional | Show title |
| poster | Optional | Show poster |
| autoPlay | Optional | Auto play |
| startAt | Optional | Resume playback |
| theme | Optional | Player theme |
| nextButton | Optional | Show Next Episode button |
| autoNext | Optional | Automatically play next episode |
| server | Optional | Default server |
| hideServer | Optional | Hide server selector |
| fullscreenButton | Optional | Show fullscreen button |
| chromecast | Optional | Enable Chromecast |
| sub | Optional | Subtitle language |

---

# Movie Examples

Basic

```
https://vidfast.pro/movie/533535
```

IMDb

```
https://vidfast.pro/movie/tt6263850
```

Autoplay

```
https://vidfast.pro/movie/533535?autoPlay=true
```

Theme

```
https://vidfast.pro/movie/533535?theme=16A085
```

Subtitle

```
https://vidfast.pro/movie/533535?sub=en
```

Resume Playback

```
https://vidfast.pro/movie/533535?startAt=120
```

---

# TV Examples

Basic

```
https://vidfast.pro/tv/63174/1/5
```

IMDb

```
https://vidfast.pro/tv/tt4052886/1/5
```

Next Episode

```
https://vidfast.pro/tv/63174/1/5?nextButton=true
```

Auto Next

```
https://vidfast.pro/tv/63174/1/5?nextButton=true&autoNext=true
```

Everything Enabled

```
https://vidfast.pro/tv/tt4052886/1/5?autoPlay=true&title=true&poster=true&theme=16A085&nextButton=true&autoNext=true
```

---

# Supported Features

| Feature | Movies | TV Shows |
|----------|--------|-----------|
| Theme | ✅ | ✅ |
| AutoPlay | ✅ | ✅ |
| Resume Playback | ✅ | ✅ |
| Poster | ✅ | ✅ |
| Next Episode | ❌ | ✅ |
| Auto Next | ❌ | ✅ |
| Chromecast | ✅ | ✅ |
| Subtitle | ✅ | ✅ |
| Multiple Servers | ✅ | ✅ |

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

# Tailwind Responsive Embed

```jsx
<div className="relative w-full pt-[56.25%]">
    <iframe
        src="EMBED_URL"
        className="absolute top-0 left-0 w-full h-full"
        frameBorder="0"
        allowFullScreen
        allow="encrypted-media"
    />
</div>
```

---

# Playback Events

VidFast communicates using

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

# Event Payload

Example

```json
{
  "type":"PLAYER_EVENT",
  "data":{
      "event":"play",
      "currentTime":120,
      "duration":7200,
      "tmdbId":533535,
      "mediaType":"movie",
      "playing":true,
      "muted":false,
      "volume":100
  }
}
```

TV Example

```json
{
  "type":"PLAYER_EVENT",
  "data":{
      "event":"timeupdate",
      "tmdbId":63174,
      "mediaType":"tv",
      "season":1,
      "episode":5,
      "currentTime":820,
      "duration":2600
  }
}
```

---

# MEDIA_DATA Event

VidFast also sends

```
MEDIA_DATA
```

This contains

- Media ID
- Media Type
- Title
- Poster
- Backdrop
- Progress
- Last Updated
- Season
- Episode

Useful for

- Continue Watching
- Watch History
- Resume Playback

---

# Playback Progress

Available Data

```
Current Time

Duration

Watched

Season

Episode

TMDB ID

IMDb ID

Poster

Backdrop

Title
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

Enable when requested

- Autoplay
- Resume Playback
- Subtitle
- Theme
- Chromecast
- Custom Server
- Hide Server Button
- Next Episode
- Auto Next
- Poster
- Title

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

Generate VidFast URL

↓

Return Embed URL

↓

Frontend renders iframe
```

Never generate embed URLs directly in the frontend.

---

# Continue Watching

Save

```
TMDB ID

IMDb ID

Current Time

Duration

Season

Episode

Poster

Backdrop

Title
```

This enables

- Continue Watching
- Watch History
- Resume Playback
- Recently Watched

---

# Error Handling

If VidFast fails

```
Try Next Player

↓

VidRock
```

---

# Best Practices

- Store the VidFast base URL in backend environment variables.
- Generate embed URLs only on the backend.
- Support both TMDB and IMDb IDs.
- Save playback progress to your backend.
- Enable subtitles only when requested.
- Enable autoplay only when requested.
- Support resume playback.
- Do not expose player selection logic to the frontend.
- Automatically fallback to the next available player.

---

# Summary

✅ Movies

✅ TV Shows

✅ TMDB IDs

✅ IMDb IDs

✅ Autoplay

✅ Resume Playback

✅ Theme Support

✅ Chromecast

✅ Subtitle Support

✅ Playback Events

✅ Continue Watching

✅ Watch History

✅ Next Episode

✅ Auto Next

✅ Multiple Servers

✅ iframe Embed

✅ Backend Friendly

✅ Automatic Fallback Compatible