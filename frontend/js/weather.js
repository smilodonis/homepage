document.addEventListener('DOMContentLoaded', () => {
  const currentContainer = document.getElementById('current-weather-data');
  const forecast3DayContainer = document.getElementById('3-day-forecast');
  const forecast7DayContainer = document.getElementById('7-day-forecast');

  fetch('/api/weather')
    .then(r => r.json())
    .then(data => {
      // Current Weather
      const current = data.current;
      currentContainer.innerHTML = `
        <div class="forecast-day">
          <img src="http://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png" alt="${current.weather[0].description}">
          <p><strong>${current.temp.toFixed(1)}°C</strong></p>
          <p>${current.weather[0].main}</p>
          <p>Wind: ${current.wind_speed} m/s ${windDirection(current.wind_deg)}</p>
          <p>Precipitation: ${data.daily[0].pop * 100}%</p>
        </div>
      `;

      // 3-Day Forecast
      const forecast3Day = data.daily.slice(1, 4);
      forecast3Day.forEach(day => {
        forecast3DayContainer.innerHTML += `
          <div class="forecast-day">
            <p><strong>${new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</strong></p>
            <img src="http://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
            <p>${day.temp.day.toFixed(1)}°C</p>
            <p>Wind: ${day.wind_speed} m/s</p>
            <p>Precip: ${day.pop * 100}%</p>
          </div>
        `;
      });

      // 7-Day Forecast
      const forecast7Day = data.daily.slice(1, 8);
      forecast7Day.forEach(day => {
        forecast7DayContainer.innerHTML += `
          <div class="forecast-day">
            <p><strong>${new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</strong></p>
            <img src="http://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
            <p>${day.temp.day.toFixed(1)}°C</p>
          </div>
        `;
      });
    });

    function windDirection(degrees) {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      return directions[Math.round(degrees / 45) % 8];
    }
});
