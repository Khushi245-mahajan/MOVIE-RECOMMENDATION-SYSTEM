/* ══════════════════════════════════════════════════════════
   NextWatch — Main App JS (static/js/app.js)
   ══════════════════════════════════════════════════════════ */

const API = '/api';
const posterPath = movie => `/static/posters/${movie.id}.png`;
const posterImg = movie => `<img class="card-poster-img" src="${posterPath(movie)}" alt="${movie.title} poster" loading="lazy" onerror="this.closest('.card-poster-wrap')?.classList.add('no-poster')">`;

/* ── State ─────────────────────────────────────────────────────────── */
const state = {
  tab: 'all',
  moods: [],
  genre: '',
  year: '',
  rating: '',
  lang: '',
  ott: '',
  sort: 'rating',
  search: '',
  movies: [],
  watchlistIds: new Set(),
};

/* ── DOM refs ──────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ════════════════════════════════════════════════════════════════════
   BOOTSTRAP
   ════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadMoodPills(),
    loadGenreOptions(),
    loadFeatured(),
    loadWatchlistCount(),
  ]);
  await fetchAndRender();
  initSearch();
  initTabs();
  initFilters();
  initModalClose();
});

/* ════════════════════════════════════════════════════════════════════
   API HELPERS
   ════════════════════════════════════════════════════════════════════ */
async function api(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

/* ════════════════════════════════════════════════════════════════════
   FETCH & RENDER MOVIES
   ════════════════════════════════════════════════════════════════════ */
async function fetchAndRender() {
  showSkeletons();

  const params = new URLSearchParams({
    tab:    state.tab,
    mood:   state.moods.join(','),
    genre:  state.genre,
    year:   state.year,
    rating: state.rating,
    lang:   state.lang,
    ott:    state.ott,
    sort:   state.sort,
    search: state.search,
  });

  try {
    const data = await api(`/movies?${params}`);
    state.movies = data.movies;
    renderMovies(data.movies, data.total);
  } catch (e) {
    console.error(e);
    toast('Failed to load movies', 'error');
  }
}


function getOttClass(o) {
  return o.includes('Netflix') ? 'ott-Netflix'
    : o.includes('Prime') ? 'ott-Prime'
    : o.includes('Hotstar') ? 'ott-Hotstar'
    : o.includes('ZEE5') ? 'ott-ZEE5'
    : o.includes('Sony') ? 'ott-SonyLIV' : '';
}

function renderOttChip(o, extraClass = '') {
  const cls = getOttClass(o);
  return `<span class="ott-chip ${cls} ${extraClass}">${o}</span>`;
}

function renderMovies(movies, total) {
  const grid = $('moviesGrid');
  const count = $('resultsCount');
  if (count) count.textContent = `${total} title${total !== 1 ? 's' : ''}`;

  if (!movies.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="icon">🎬</div>
        <h3>No movies found</h3>
        <p>Try adjusting your filters or clearing your mood selection</p>
      </div>`;
    return;
  }

  grid.innerHTML = '';
  movies.forEach((m, i) => {
    const card = buildMovieCard(m, i);
    grid.appendChild(card);
  });
}

function buildMovieCard(m, delay = 0) {
  const div = document.createElement('div');
  div.className = `movie-card${m.industry === 'bollywood' ? ' bolly' : ''}`;
  div.style.animationDelay = `${delay * 0.04}s`;

  const badgeClass = m.industry === 'bollywood' ? 'badge-bollywood' : 'badge-hollywood';
  const badgeLabel = m.industry === 'bollywood' ? '🎭 Bolly' : '🎬 Holly';

  const moodTags = (m.moods || []).slice(0, 2).map(mid => {
    const mood = window.MOODS?.find(mo => mo.id === mid);
    return mood ? `<span class="mood-micro">${mood.emoji} ${mood.label}</span>` : '';
  }).join('');

  const inWatchlist = state.watchlistIds.has(m.id);
  const ottPreview = (m.ott || []).slice(0, 2).map(o => renderOttChip(o, 'card-ott-chip')).join('');

  div.innerHTML = `
    <div class="card-poster-wrap">
      ${posterImg(m)}
      <div class="card-poster-placeholder">
        <div class="fallback-title">${m.title}</div>
        <span class="year-label">${m.year}</span>
      </div>
      <div class="card-overlay">
        <div class="card-overlay-actions">
          <button class="btn btn-primary btn-sm" onclick="openModal(${m.id}, event)">View</button>
          <button class="btn btn-outline btn-sm wl-toggle ${inWatchlist ? 'in-wl' : ''}"
            onclick="toggleWatchlist(${m.id}, event)" title="${inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}">
            ${inWatchlist ? '✓' : '+'} Save
          </button>
        </div>
      </div>
      <span class="card-badge ${badgeClass}">${badgeLabel}</span>
      <span class="card-rating">⭐ ${m.rating}</span>
      ${m.awards ? '<span class="award-star">🏆</span>' : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${m.title}</div>
      <div class="card-sub">
        <span>${m.year}</span>
        <span class="dot">·</span>
        ${(m.genres || []).slice(0, 1).map(g => `<span class="genre-pill">${g}</span>`).join('')}
      </div>
      <div class="card-moods">${moodTags}</div>
      <div class="card-platforms">${ottPreview || '<span class="card-platform-text">Platform info unavailable</span>'}</div>
    </div>`;

  div.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    openModal(m.id);
  });

  return div;
}

/* ════════════════════════════════════════════════════════════════════
   HERO / FEATURED
   ════════════════════════════════════════════════════════════════════ */
async function loadFeatured() {
  const hero = $('heroBanner');
  if (!hero) return;
  try {
    const m = await api(`/featured?tab=${state.tab}`);
    const industryClass = m.industry === 'bollywood' ? 'bollywood' : 'hollywood';
    const industryLabel = m.industry === 'bollywood' ? '🎭 Bollywood' : '🎬 Hollywood';
    hero.innerHTML = `
      <img class="hero-poster" src="${posterPath(m)}" alt="${m.title} poster" loading="eager" onerror="this.remove()">
      <div class="hero-bg">${m.emoji}</div>
      <div class="hero-gradient"></div>
      <div class="hero-content">
        <span class="hero-industry-badge ${industryClass}">${industryLabel}</span>
        <h1 class="hero-title">${m.title}</h1>
        <div class="hero-meta">
          <span class="hero-rating">⭐ ${m.rating}</span>
          <span>·</span><span>${m.year}</span>
          <span>·</span><span>${m.runtime}</span>
          <span>·</span><span>${m.language}</span>
        </div>
        <p class="hero-desc">${m.description}</p>
        <div class="hero-actions">
          <button class="btn btn-primary" onclick="openModal(${m.id})">🎬 View Details</button>
          <button class="btn btn-outline" onclick="toggleWatchlist(${m.id})">+ Watchlist</button>
        </div>
      </div>`;
  } catch(e) { console.error('Featured load failed', e); }
}

/* ════════════════════════════════════════════════════════════════════
   MOOD PILLS
   ════════════════════════════════════════════════════════════════════ */
async function loadMoodPills() {
  try {
    const data = await api('/moods');
    window.MOODS = data.moods;
    renderMoodPills();
  } catch(e) { console.error(e); }
}

function renderMoodPills() {
  const grid = $('moodGrid');
  if (!grid || !window.MOODS) return;
  grid.innerHTML = '';
  window.MOODS.forEach(mood => {
    const btn = document.createElement('button');
    const isActive = state.moods.includes(mood.id);
    const bollyClass = state.tab === 'bollywood' && isActive ? ' bolly-mood' : '';
    btn.className = `mood-pill${isActive ? ' active' + bollyClass : ''}`;
    btn.innerHTML = `<span class="emoji">${mood.emoji}</span>${mood.label}`;
    btn.addEventListener('click', () => {
      if (state.moods.includes(mood.id)) {
        state.moods = state.moods.filter(m => m !== mood.id);
      } else {
        state.moods.push(mood.id);
      }
      renderMoodPills();
      fetchAndRender();
    });
    grid.appendChild(btn);
  });
}

/* ════════════════════════════════════════════════════════════════════
   GENRE OPTIONS
   ════════════════════════════════════════════════════════════════════ */
async function loadGenreOptions() {
  const sel = $('genreFilter');
  if (!sel) return;
  try {
    const data = await api('/genres');
    data.genres.forEach(g => {
      const o = document.createElement('option');
      o.value = g; o.textContent = g;
      sel.appendChild(o);
    });
  } catch(e) { console.error(e); }
}

/* ════════════════════════════════════════════════════════════════════
   TABS
   ════════════════════════════════════════════════════════════════════ */
function initTabs() {
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      state.moods = [];
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const langFilter = $('langFilter');
      const bollyHero = $('bollyHero');
      if (langFilter) langFilter.style.display = state.tab === 'bollywood' ? 'block' : 'none';
      if (bollyHero) bollyHero.style.display = state.tab === 'bollywood' ? 'block' : 'none';

      renderMoodPills();
      loadFeatured();
      fetchAndRender();
    });
  });
}

/* ════════════════════════════════════════════════════════════════════
   FILTERS
   ════════════════════════════════════════════════════════════════════ */
function initFilters() {
  const map = { genreFilter: 'genre', yearFilter: 'year', ratingFilter: 'rating', langFilter: 'lang', ottFilter: 'ott', sortSelect: 'sort' };
  Object.entries(map).forEach(([id, key]) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', e => {
      state[key] = e.target.value;
      fetchAndRender();
    });
  });
}

/* ════════════════════════════════════════════════════════════════════
   SEARCH + AUTOCOMPLETE
   ════════════════════════════════════════════════════════════════════ */
function initSearch() {
  const input = $('searchInput');
  const box = $('autocompleteBox');
  if (!input) return;

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      state.search = input.value.trim().toLowerCase();
      fetchAndRender();
      if (state.search.length >= 2) {
        try {
          const data = await api(`/search/suggest?q=${encodeURIComponent(state.search)}`);
          renderSuggestions(data.suggestions);
        } catch(e) {}
      } else {
        if (box) box.classList.remove('open');
      }
    }, 250);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap') && box) box.classList.remove('open');
  });
}

function renderSuggestions(suggestions) {
  const box = $('autocompleteBox');
  if (!box) return;
  if (!suggestions.length) { box.classList.remove('open'); return; }

  box.innerHTML = suggestions.map(s => `
    <div class="ac-item" onclick="pickSuggestion(${s.id}, '${s.label.replace(/'/g,"\\'")}')">
      <span class="ac-emoji">${s.emoji || (s.type === 'person' ? '🎭' : '🎬')}</span>
      <span class="ac-label">${s.label}</span>
      <span class="ac-meta">${s.year || s.type}</span>
    </div>`).join('');
  box.classList.add('open');
}

window.pickSuggestion = (id, label) => {
  const input = $('searchInput');
  const box = $('autocompleteBox');
  if (input) input.value = label;
  if (box) box.classList.remove('open');
  state.search = label.toLowerCase();
  fetchAndRender();
};

/* ════════════════════════════════════════════════════════════════════
   MODAL
   ════════════════════════════════════════════════════════════════════ */
window.openModal = async (movieId, e) => {
  if (e) e.stopPropagation();
  const overlay = $('modalOverlay');
  if (!overlay) return;

  // Show overlay with loading state
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const [movie, recsData] = await Promise.all([
      api(`/movies/${movieId}`),
      api(`/recommend/${movieId}`),
    ]);
    renderModal(movie, recsData.recommendations || []);
  } catch(e) {
    console.error(e);
    toast('Could not load movie details', 'error');
    closeModal();
  }
};

function renderModal(m, recs) {
  const hero = $('modalHero');
  const body = $('modalBody');
  if (!hero || !body) return;

  const bgColor = m.industry === 'bollywood'
    ? 'linear-gradient(135deg,rgba(233,30,140,0.2),rgba(255,107,53,0.12))'
    : 'linear-gradient(135deg,rgba(255,107,53,0.15),rgba(8,8,16,0.9))';

  hero.style.background = bgColor;
  hero.innerHTML = `<img class="modal-hero-img" src="${posterPath(m)}" alt="${m.title} poster" loading="eager" onerror="this.remove()"><div class="modal-hero-overlay"></div>`;

  const inWatchlist = state.watchlistIds.has(m.id);

  const ottHTML = (m.ott || []).map(o => renderOttChip(o)).join('');

  const moodHTML = (m.moods || []).map(mid => {
    const mood = window.MOODS?.find(mo => mo.id === mid);
    return mood ? `<span class="modal-mood-chip">${mood.emoji} ${mood.label}</span>` : '';
  }).join('');

  const recsHTML = recs.length ? `
    <div class="modal-recs">
      <div class="modal-section-label">You Might Also Like</div>
      <div class="scroll-row" style="margin-top:10px">
        ${recs.map(r => `<div class="movie-card" onclick="openModal(${r.id})" style="flex:0 0 150px;cursor:pointer">
          <div class="card-poster-wrap">${posterImg(r)}<div class="card-poster-placeholder"><div class="fallback-title">${r.title}</div><span class="year-label">${r.year}</span></div></div>
          <div class="card-body"><div class="card-title" style="font-size:0.78rem">${r.title}</div><div class="card-platforms">${(r.ott||[]).slice(0,1).map(o => renderOttChip(o, 'card-ott-chip')).join('')}</div></div>
        </div>`).join('')}
      </div>
    </div>` : '';

  body.innerHTML = `
    <div class="modal-header">
      <div class="modal-badge-row">
        <span class="modal-industry-badge ${m.industry}">${m.industry === 'bollywood' ? '🎭 Bollywood' : '🎬 Hollywood'}</span>
        ${m.awards ? '<span class="modal-award">🏆 Award Winner</span>' : ''}
      </div>
      <div class="modal-title">${m.title}</div>
      <div class="modal-year-lang">${m.year} · ${m.runtime} · ${m.language}</div>
    </div>

    <div class="modal-top-row">
      <div class="modal-genres">${(m.genres||[]).map(g=>`<span class="genre-chip">${g}</span>`).join('')}</div>
      <div class="modal-rating-card">
        <span class="rating-star">⭐</span>
        <div>
          <div class="rating-score">${m.rating}</div>
          <div class="rating-denom">/ 10</div>
        </div>
      </div>
    </div>

    <p class="modal-desc">${m.description}</p>

    <div class="modal-info-grid">
      <div class="info-item"><div class="info-label">Director</div><div class="info-val">${m.director}</div></div>
      <div class="info-item"><div class="info-label">Cast</div><div class="info-val">${(m.cast||[]).slice(0,3).join(', ')}</div></div>
      <div class="info-item"><div class="info-label">Runtime</div><div class="info-val">${m.runtime}</div></div>
      <div class="info-item"><div class="info-label">Language</div><div class="info-val">${m.language}</div></div>
    </div>

    <div class="modal-section-label">Mood Tags</div>
    <div class="modal-moods" style="margin-bottom:1.5rem">${moodHTML}</div>

    <div class="modal-section-label">Where to Watch</div>
    <div class="ott-chips" style="margin-bottom:1.5rem">${ottHTML || '<span style="color:var(--text3);font-size:0.85rem">Not available on tracked platforms</span>'}</div>

    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.5rem">
      <button class="btn btn-outline wl-toggle ${inWatchlist?'in-wl':''}"
        onclick="toggleWatchlist(${m.id})">
        ${inWatchlist ? '✓ In Watchlist' : '+ Add to Watchlist'}
      </button>
    </div>

    ${recsHTML}`;
}

window.closeModal = () => {
  const overlay = $('modalOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
};

function initModalClose() {
  const overlay = $('modalOverlay');
  const btn = $('modalClose');
  if (btn) btn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

/* ════════════════════════════════════════════════════════════════════
   WATCHLIST
   ════════════════════════════════════════════════════════════════════ */
async function loadWatchlistCount() {
  try {
    const data = await fetch(`${API}/watchlist`).then(r => r.json());
    state.watchlistIds = new Set((data.watchlist || []).map(m => m.id));
    updateWatchlistBadge();
  } catch(e) {}
}

window.toggleWatchlist = async (movieId, e) => {
  if (e) e.stopPropagation();
  const inList = state.watchlistIds.has(movieId);
  const method = inList ? 'DELETE' : 'POST';

  try {
    const res = await fetch(`${API}/watchlist/${movieId}`, { method });
    const data = await res.json();
    if (data.success) {
      inList ? state.watchlistIds.delete(movieId) : state.watchlistIds.add(movieId);
      updateWatchlistBadge();
      toast(inList ? 'Removed from watchlist' : 'Added to watchlist! 🎬', inList ? 'info' : 'success');
      // Refresh buttons
      $$('.wl-toggle').forEach(btn => {
        const id = parseInt(btn.closest('[onclick]')?.getAttribute('onclick')?.match(/\d+/)?.[0]);
        if (id === movieId) {
          btn.classList.toggle('in-wl', !inList);
          btn.textContent = !inList ? '✓ In Watchlist' : '+ Add to Watchlist';
        }
      });
    }
  } catch(err) { toast('Could not update watchlist', 'error'); }
};

function updateWatchlistBadge() {
  const badge = $('wlBadge');
  if (badge) {
    badge.textContent = state.watchlistIds.size || '';
    badge.dataset.count = state.watchlistIds.size;
  }
}

/* ════════════════════════════════════════════════════════════════════
   SKELETON LOADERS
   ════════════════════════════════════════════════════════════════════ */
function showSkeletons(n = 10) {
  const grid = $('moviesGrid');
  if (!grid) return;
  grid.innerHTML = Array(n).fill(`
    <div class="skeleton-card">
      <div class="skeleton skeleton-poster"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>
    </div>`).join('');
}

/* ════════════════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════════════════ */
window.toast = (msg, type = 'info') => {
  const container = $('toastContainer') || (() => {
    const c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  })();

  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
};
