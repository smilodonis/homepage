document.addEventListener('DOMContentLoaded', () => {
  const newsContainer = document.getElementById('news-container');
  fetch('/api/global-news')
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
        categoryContainer.className = 'global-category-container';
        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category;
        categoryContainer.appendChild(categoryTitle);
        const articlesGrid = document.createElement('div');
        articlesGrid.className = 'global-articles-grid';
        
        categories[category].forEach(item => {
          const newsDiv = document.createElement('div');
          newsDiv.className = 'news-item';
          const summary = item.summary || '';
          const title = item.title || 'No Title';
          const link = item.link || '#';
          const source = item.source || 'Unknown Source';
          const published = item.published ? new Date(item.published).toLocaleString() : 'No Date';
          const thumbnail = (item.media_content && item.media_content.length > 0) ? item.media_content[0].url : '';

          newsDiv.innerHTML = `
            ${thumbnail ? `<a href="${link}" target="_blank"><img src="${thumbnail}" class="news-thumbnail"></a>` : ''}
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


