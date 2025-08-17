document.addEventListener('DOMContentLoaded', () => {
  const wallStreetContainer = document.getElementById('wall-street-news');
  const cryptoContainer = document.getElementById('crypto-news');

  fetch('/api/finance-news')
    .then(r => r.json())
    .then(newsItems => {
      newsItems.forEach(item => {
        const container = item.category === 'Wall Street' ? wallStreetContainer : cryptoContainer;
        const newsDiv = document.createElement('div');
        newsDiv.className = 'news-item';
        const summary = (item.summary || '').replace(/<img[^>]*>/g,"");
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
        container.appendChild(newsDiv);
      });
    });
});


