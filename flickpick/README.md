# 🎬 NextWatch — Movie Recommendation App

A full-stack movie recommendation web app with Bollywood-first design,
AI-powered recommendations, mood-based filtering, and OTT platform tracking.

---

## 🗂️ Project Structure

```
NextWatch/
├── app.py                  ← Flask backend (all API routes)
├── requirements.txt        ← Python dependencies
│
├── data/
│   └── movies_db.py        ← Master movie database (50+ movies)
│
├── ml/
│   └── recommender.py      ← TF-IDF + Cosine Similarity ML engine
│
├── templates/
│   ├── index.html          ← Main discover page
│   ├── bollywood.html      ← Bollywood dedicated page
│   └── watchlist.html      ← My Watchlist page
│
└── static/
    ├── css/
    │   └── main.css        ← Full design system (dark cinematic theme)
    └── js/
        └── app.js          ← Frontend logic (API calls, filters, modal, etc.)
```

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd NextWatch
pip install -r requirements.txt
```

### 2. Run the server

```bash
python app.py
```

### 3. Open in browser

```
http://localhost:5000
```

---

## ✨ Features

### 🎭 Bollywood

- 30+ Bollywood/Indian films (Hindi, Telugu, Tamil)
- Dedicated Bollywood page with director & language filters
- OTT availability: Netflix, Prime Video, Disney+ Hotstar, ZEE5, SonyLIV
- Language filter (Hindi / Telugu / Tamil / Punjabi)
- Browse by director (Rajamouli, Hirani, Kashyap, Zoya Akhtar, etc.)

### 🎬 Hollywood / International

- 20+ top Hollywood + international films
- Full genre, year, rating filters

### 😄 Mood-Based Filtering (12 moods)

- Feel Good · Romantic · Thrilling · Comedy · Emotional
- Inspiring · Mind-Bending · Action · Family · Dark & Gritty · Animated · Classics
- Multi-select — pick multiple moods simultaneously

### 🤖 ML Recommendations

- TF-IDF content-based filtering (genres, moods, cast, director, tags)
- Cosine similarity for "You Might Also Like" section
- Mood-score weighted recommendations

### 🔍 Search & Filters

- Live search with autocomplete (title, cast, director)
- Filter by: genre, year decade, IMDb rating, language, OTT platform
- Sort by: rating, newest, A-Z

### 🎬 Watchlist

- Session-based watchlist (add/remove from any page)
- Watchlist page with stats (count, avg rating, Bolly vs Holly split)

### 🎨 UI/UX

- Cinematic dark theme with grain overlay and ambient glows
- Animated hero banner with featured movie
- Skeleton loaders while content fetches
- Smooth card hover effects and modal with ML-powered "similar" row
- Toast notifications for all actions
- Fully responsive (mobile, tablet, desktop)

---

## 🧠 ML Engine Details

**File:** `ml/recommender.py`

The recommender builds a **TF-IDF feature matrix** from each movie's:

- genres, moods, director, cast (top 3), tags, language, industry

Then uses **cosine similarity** to find the most similar movies.

Mood-based recommendations score movies by:

1. Number of matching moods (primary weight)
2. IMDb rating (tiebreaker / boost)

---

## 🔌 API Reference

| Method | Endpoint                                   | Description              |
| ------ | ------------------------------------------ | ------------------------ |
| GET    | `/api/movies`                              | List + filter movies     |
| GET    | `/api/movies/<id>`                         | Movie detail             |
| GET    | `/api/recommend/<id>`                      | ML-similar movies        |
| GET    | `/api/mood-recommend?moods=happy,romantic` | Mood-based picks         |
| GET    | `/api/trending`                            | Trending movies          |
| GET    | `/api/featured?tab=bollywood`              | Random featured film     |
| GET    | `/api/genres`                              | All genres               |
| GET    | `/api/moods`                               | All mood definitions     |
| GET    | `/api/watchlist`                           | Get watchlist            |
| POST   | `/api/watchlist/<id>`                      | Add to watchlist         |
| DELETE | `/api/watchlist/<id>`                      | Remove from watchlist    |
| GET    | `/api/search/suggest?q=query`              | Autocomplete suggestions |

---

## 🎨 Design System

- **Display font:** Bebas Neue (titles, numbers)
- **UI font:** Syne (headings, labels)
- **Body font:** DM Sans (all body text)
- **Theme:** Dark cinematic — `#080810` bg, `#ff6b35` accent, `#e91e8c` Bollywood pink
- **Effects:** CSS grain overlay, ambient radial glows, skeleton loaders, staggered fade-up animations

---

## 📦 Tech Stack

| Layer    | Tech                                             |
| -------- | ------------------------------------------------ |
| Backend  | Python · Flask · Flask-CORS                      |
| ML       | scikit-learn (TF-IDF, cosine similarity) · NumPy |
| Frontend | Vanilla HTML5 · CSS3 · JavaScript (ES2022)       |
| Storage  | Flask session (watchlist)                        |
| Fonts    | Google Fonts (Bebas Neue, Syne, DM Sans)         |
