"""
ml/recommender.py — NextWatch ML Engine
Uses TF-IDF + Cosine Similarity for content-based filtering
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler


class MovieRecommender:
    """
    Content-based movie recommender using TF-IDF on
    genres + moods + cast + director + tags.
    """

    def __init__(self, movies: list):
        self.movies = movies
        self.id_to_idx = {m["id"]: i for i, m in enumerate(movies)}
        self._build_matrix()

    # ── Build TF-IDF feature matrix ─────────────────────────────────────

    def _build_soup(self, movie: dict) -> str:
        parts = []
        parts += movie.get("genres", [])
        parts += movie.get("moods", [])
        parts += [movie.get("director", "").replace(" ", "_")]
        parts += [c.replace(" ", "_") for c in movie.get("cast", [])[:3]]
        parts += movie.get("tags", [])
        parts += [movie.get("language", "")]
        parts += [movie.get("industry", "")]
        return " ".join(p.lower() for p in parts if p)

    def _build_matrix(self):
        soups = [self._build_soup(m) for m in self.movies]
        self.tfidf = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        self.tfidf_matrix = self.tfidf.fit_transform(soups)
        self.cosine_sim = cosine_similarity(self.tfidf_matrix, self.tfidf_matrix)

    # ── Get similar movies ──────────────────────────────────────────────

    def get_similar(self, movie_id: int, n: int = 6) -> list:
        if movie_id not in self.id_to_idx:
            return []

        idx = self.id_to_idx[movie_id]
        sim_scores = list(enumerate(self.cosine_sim[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        sim_scores = [s for s in sim_scores if s[0] != idx][:n]

        results = []
        for i, score in sim_scores:
            movie = dict(self.movies[i])
            movie["similarity_score"] = round(float(score), 3)
            results.append(movie)
        return results

    # ── Get by mood ─────────────────────────────────────────────────────

    def get_by_mood(self, moods: list, limit: int = 8) -> list:
        if not moods or moods == [""]:
            return []

        # Score each movie by how many requested moods it matches
        scored = []
        for m in self.movies:
            match_count = sum(1 for mood in moods if mood in m.get("moods", []))
            if match_count > 0:
                # Boost by rating
                score = match_count * 10 + m["rating"]
                scored.append((score, m))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = []
        for score, m in scored[:limit]:
            movie = dict(m)
            movie["mood_match"] = score
            results.append(movie)
        return results

    # ── Get trending (top-rated with slight randomness) ─────────────────

    def get_trending(self, n: int = 10) -> list:
        import random
        scored = [(m["rating"] + random.uniform(-0.2, 0.2), m) for m in self.movies]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in scored[:n]]

    # ── Get diverse picks across genres ─────────────────────────────────

    def get_diverse(self, n: int = 8) -> list:
        seen_genres = set()
        picks = []
        for m in sorted(self.movies, key=lambda x: x["rating"], reverse=True):
            primary_genre = m["genres"][0] if m["genres"] else "other"
            if primary_genre not in seen_genres:
                picks.append(m)
                seen_genres.add(primary_genre)
            if len(picks) >= n:
                break
        return picks
