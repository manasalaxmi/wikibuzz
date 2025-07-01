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

    const trendingRes = await fetch(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${yyyy}/${mm}/${dd}`
    );
    if (!trendingRes.ok) throw new Error(`HTTP error! status: ${trendingRes.status}`);
    const trendingData = await trendingRes.json();
    const trendingArticles = trendingData.items[0]?.articles
      ?.filter(a => !a.article.startsWith('Special:') && a.article !== 'Main_Page')
      .slice(0, 5) || [];

    for (const article of trendingArticles) {
      await renderArticleCard(article.article);
    }
  } catch (err) {
    console.error("Trending fetch failed:", err);
    container.appendChild(document.createTextNode("Failed to load trending articles."));
  }
}

async function fetchRelevantArticles() {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(genre)}&srlimit=5`
    );
    if (!searchRes.ok) throw new Error(`HTTP error! status: ${searchRes.status}`);
    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];

    for (const item of results) {
      await renderArticleCard(item.title);
    }
  } catch (err) {
    console.error("Relevant fetch failed:", err);
    container.appendChild(document.createTextNode("Failed to load relevant articles."));
  }
}

async function renderArticleCard(title) {
  try {
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!summaryRes.ok) throw new Error(`HTTP error! status: ${summaryRes.status}`);
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
  try {
    loader.style.display = 'block';
    container.innerHTML = '';
    await fetchTrendingArticles();
    await fetchRelevantArticles();
  } catch (err) {
    console.error("Feed loading failed:", err);
    container.appendChild(document.createTextNode("Failed to load feed."));
  } finally {
    loader.style.display = 'none';
  }
}

async function handleSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  container.innerHTML = '';
  loader.style.display = 'block';

  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(query)}&srlimit=10`
    );
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    for (let result of data.query?.search || []) {
      await renderArticleCard(result.title);
    }
  } catch (error) {
    console.error('Search failed:', error);
    container.appendChild(document.createTextNode("Search failed."));
  } finally {
    loader.style.display = 'none';
  }
}

loadFeed();
