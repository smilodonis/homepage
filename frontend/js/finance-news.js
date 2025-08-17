document.addEventListener('DOMContentLoaded', () => {
  const newsContainer = document.getElementById('news-container');
  fetch('/api/finance-news')
    .then(r => r.json())
    .then(newsItems => {
      newsContainer.innerHTML = '';
      const categories = {};
      newsItems.forEach(item => {
        if (!categories[item.category]) {
          categories[item.category] = [];
        }
        categories[item.category].push(item);
      });

      for (const category in categories) {
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'news-category-container';
        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category;
        categoryContainer.appendChild(categoryTitle);
        const articlesGrid = document.createElement('div');
        articlesGrid.className = 'news-grid';
        
        categories[category].forEach(item => {
          const newsDiv = document.createElement('div');
          newsDiv.className = 'news-item';
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
          articlesGrid.appendChild(newsDiv);
        });
        categoryContainer.appendChild(articlesGrid);
        newsContainer.appendChild(categoryContainer);
      }
    });
});


