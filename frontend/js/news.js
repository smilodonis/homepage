document.addEventListener('DOMContentLoaded', () => {
  const newsContainer = document.getElementById('news-container');
  fetch('/api/news')
    .then(r => r.json())
    .then(newsItems => {
      newsContainer.innerHTML = '';
      newsItems.forEach(item => {
        const newsDiv = document.createElement('div');
        newsDiv.className = 'news--item';
        const summary = item.summary || '';
        const title = item.title || 'No Title';
        const link = item.link || '#';
        const source = item.source || 'Unknown Source';
        const published = item.published ? new Date(item.published).toLocaleString() : 'No Date';

        newsDiv.innerHTML = `
          <div class="news-content">
            <h3><a href="${link}" target="_blank">${title}</a></h3>
            <p>${summary}</p>
            <small><strong>Source:</strong> ${source} | <strong>Published:</strong> ${published}</small>
          </div>
        `;
        newsContainer.appendChild(newsDiv);
      });
    });
});


