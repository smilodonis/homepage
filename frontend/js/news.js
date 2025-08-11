document.addEventListener('DOMContentLoaded', () => {
  const newsContainer = document.getElementById('news-container');
  fetch('/api/news')
    .then(r => r.json())
    .then(newsItems => {
      newsContainer.innerHTML = '';
      newsItems.forEach(item => {
        const newsDiv = document.createElement('div');
        newsDiv.className = 'news-item';
        newsDiv.innerHTML = `<h3><a href="${item.link}" target="_blank">${item.title}</a></h3><p>${item.summary}</p><small><strong>Source:</strong> ${item.source} | <strong>Published:</strong> ${new Date(item.published).toLocaleString()}</small>`;
        newsContainer.appendChild(newsDiv);
      });
    });
});


