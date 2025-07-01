const genre = localStorage.getItem('selectedGenre') || 'Science';
const container = document.getElementById('article-container');
const loader = document.getElementById('loader');

// Display selected genre
const genreLabel = document.getElementById('genreLabel');
if (genreLabel) genreLabel.textContent = `Genre: ${genre}`;

async function fetchTrendingArticles() {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    const trendingRes = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${yyyy}/${mm}/${dd}`);
    const trendingData = await trendingRes.json();
    const trendingArticles = trendingData.items[0].articles
      .filter(a => !a.article.startsWith('Special:') && a.article !== 'Main_Page')
      .slice(0, 5);

    for (const article of trendingArticles) {
      await renderArticleCard(article.article);
    }
  } catch (err) {
    console.error("Trending fetch failed", err);
  }
}

async function fetchRelevantArticles() {
  try {
    const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(genre)}&srlimit=5`);
    const searchData = await searchRes.json();
    const results = searchData.query.search;

    for (const item of results) {
      await renderArticleCard(item.title);
    }
  } catch (err) {
    console.error("Relevant fetch failed", err);
  }
}

async function renderArticleCard(title) {
  try {
    const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    const summary = await summaryRes.json();

    if (!summary || !summary.title || summary.title === 'Not found.') return;

    const card = document.createElement('div');
    card.className = 'article-card';
    card.innerHTML = `
      <h2>${summary.title}</h2>
      ${summary.thumbnail ? `<img src="${summary.thumbnail.source}" alt="${summary.title}">` : ''}
      <p>${summary.extract}</p>
      <div class="card-footer">
        <div class="icons"></div>
        <a class="read-more" href="${summary.content_urls.desktop.page}" target="_blank">Read more →</a>
      </div>
    `;
    container.appendChild(card);
  } catch (err) {
    console.error("Error rendering card for", title, err);
  }
}

async function loadFeed() {
  loader.style.display = 'block';
  await fetchTrendingArticles();
  await fetchRelevantArticles();
  loader.style.display = 'none';
}
async function handleSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  container.innerHTML = '';
  loader.style.display = 'block';

  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(query)}&srlimit=10`);
    const data = await res.json();

    for (let result of data.query.search) {
      await renderArticleCard(result.title);
    }
  } catch (error) {
    console.error('Search failed:', error);
  }

  loader.style.display = 'none';
}

// OPTIONAL: Load current events
async function loadCurrentEvents() {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/html/Portal:Current_events`);
    const html = await res.text();
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const items = temp.querySelectorAll('ul > li');

    for (let item of items) {
      const text = item.textContent.trim();
      const link = item.querySelector('a')?.href || 'https://en.wikipedia.org/wiki/Portal:Current_events';

      const card = document.createElement('div');
      card.className = 'article-card';
      card.innerHTML = `
        <h2>📰 Current Event</h2>
        <p>${text}</p>
        <a class="read-more" href="${link}" target="_blank">Read more →</a>
      `;
      container.appendChild(card);
    }
  } catch (error) {
    console.error("Failed to load current events:", error);
  }
}

loadFeed();
