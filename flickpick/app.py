"""
NextWatch — Flask Backend
Run: python app.py
Visit: http://localhost:5000
"""

from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import json, os, random
from datetime import datetime

from ml.recommender import MovieRecommender
from data.movies_db import MOVIES, MOODS

app = Flask(__name__)
app.secret_key = "flickpick_secret_2024"
CORS(app)

# ── Boot ML engine ─────────────────────────────────────────────────────────
recommender = MovieRecommender(MOVIES)

# ── Pages ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/bollywood")
def bollywood():
    return render_template("bollywood.html")

@app.route("/watchlist")
def watchlist():
    return render_template("watchlist.html")

# ── API: Movies ─────────────────────────────────────────────────────────────

@app.route("/api/movies")
def api_movies():
    tab      = request.args.get("tab", "all")
    mood     = request.args.get("mood", "")
    genre    = request.args.get("genre", "")
    year     = request.args.get("year", "")
    rating   = request.args.get("rating", "")
    lang     = request.args.get("lang", "")
    ott      = request.args.get("ott", "")
    search   = request.args.get("search", "").lower()
    sort_by  = request.args.get("sort", "rating")

    results = list(MOVIES)

    if tab == "bollywood":
        results = [m for m in results if m["industry"] == "bollywood"]
    elif tab == "hollywood":
        results = [m for m in results if m["industry"] == "hollywood"]

    if mood:
        moods = mood.split(",")
        results = [m for m in results if any(md in m["moods"] for md in moods)]

    if genre:
        results = [m for m in results if genre in m["genres"]]

    if rating:
        results = [m for m in results if m["rating"] >= float(rating)]

    if lang:
        results = [m for m in results if m["language"] == lang]

    if ott:
        results = [m for m in results if ott in m["ott"]]

    if year:
        if year == "2020s":   results = [m for m in results if m["year"] >= 2020]
        elif year == "2010s": results = [m for m in results if 2010 <= m["year"] < 2020]
        elif year == "2000s": results = [m for m in results if 2000 <= m["year"] < 2010]
        elif year == "90s":   results = [m for m in results if m["year"] < 2000]

    if search:
        results = [m for m in results if
            search in m["title"].lower() or
            search in m["director"].lower() or
            any(search in c.lower() for c in m["cast"]) or
            any(search in g.lower() for g in m["genres"])
        ]

    # Sort
    if sort_by == "rating":
        results.sort(key=lambda m: m["rating"], reverse=True)
    elif sort_by == "year":
        results.sort(key=lambda m: m["year"], reverse=True)
    elif sort_by == "title":
        results.sort(key=lambda m: m["title"])

    return jsonify({"movies": results, "total": len(results)})

@app.route("/api/movies/<int:movie_id>")
def api_movie_detail(movie_id):
    movie = next((m for m in MOVIES if m["id"] == movie_id), None)
    if not movie:
        return jsonify({"error": "Movie not found"}), 404
    return jsonify(movie)

# ── API: ML Recommendations ─────────────────────────────────────────────────

@app.route("/api/recommend/<int:movie_id>")
def api_recommend(movie_id):
    recs = recommender.get_similar(movie_id, n=6)
    return jsonify({"recommendations": recs})

@app.route("/api/mood-recommend")
def api_mood_recommend():
    moods = request.args.get("moods", "").split(",")
    limit = int(request.args.get("limit", 8))
    recs  = recommender.get_by_mood(moods, limit)
    return jsonify({"recommendations": recs})

@app.route("/api/trending")
def api_trending():
    # Simulated trending: top-rated shuffled slightly
    movies = sorted(MOVIES, key=lambda m: m["rating"] + random.uniform(-0.3, 0.3), reverse=True)
    return jsonify({"movies": movies[:10]})

@app.route("/api/featured")
def api_featured():
    tab = request.args.get("tab", "all")
    pool = MOVIES if tab == "all" else [m for m in MOVIES if m["industry"] == tab]
    featured = random.choice([m for m in pool if m["rating"] >= 8.0])
    return jsonify(featured)

# ── API: Genres & Moods ─────────────────────────────────────────────────────

@app.route("/api/genres")
def api_genres():
    tab = request.args.get("tab", "all")
    pool = MOVIES if tab == "all" else [m for m in MOVIES if m["industry"] == tab]
    genres = sorted(set(g for m in pool for g in m["genres"]))
    return jsonify({"genres": genres})

@app.route("/api/moods")
def api_moods():
    return jsonify({"moods": MOODS})

# ── API: Watchlist (session-based) ──────────────────────────────────────────

@app.route("/api/watchlist", methods=["GET"])
def get_watchlist():
    wl = session.get("watchlist", [])
    movies = [m for m in MOVIES if m["id"] in wl]
    return jsonify({"watchlist": movies})

@app.route("/api/watchlist/<int:movie_id>", methods=["POST"])
def add_watchlist(movie_id):
    wl = session.get("watchlist", [])
    if movie_id not in wl:
        wl.append(movie_id)
        session["watchlist"] = wl
    return jsonify({"success": True, "count": len(wl)})

@app.route("/api/watchlist/<int:movie_id>", methods=["DELETE"])
def remove_watchlist(movie_id):
    wl = session.get("watchlist", [])
    wl = [i for i in wl if i != movie_id]
    session["watchlist"] = wl
    return jsonify({"success": True, "count": len(wl)})

# ── API: Search Suggestions ─────────────────────────────────────────────────

@app.route("/api/search/suggest")
def search_suggest():
    q = request.args.get("q", "").lower()
    if len(q) < 2:
        return jsonify({"suggestions": []})
    seen, suggestions = set(), []
    for m in MOVIES:
        if q in m["title"].lower() and m["title"] not in seen:
            suggestions.append({"type": "movie", "label": m["title"], "id": m["id"], "year": m["year"], "emoji": m["emoji"]})
            seen.add(m["title"])
        for c in m["cast"]:
            if q in c.lower() and c not in seen:
                suggestions.append({"type": "person", "label": c, "id": m["id"]})
                seen.add(c)
        if len(suggestions) >= 6:
            break
    return jsonify({"suggestions": suggestions})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
