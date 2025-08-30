document.addEventListener('DOMContentLoaded', () => {
  const currentContainer = document.getElementById('current-weather');
  const forecastContainer = document.getElementById('forecast-container');

  let windChartInstance = null;

  function degToArrow(deg) {
      const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
      const index = Math.round((deg || 0) / 45) % 8;
      return arrows[index];
  }

  function renderWeather(data) {
      const current = data.current;
      currentContainer.innerHTML = `
          <div class="current-main">
              <i class="wi ${getWeatherIcon(current.weather[0].id)}"></i>
              <div class="current-temp">${current.temp.toFixed(1)}°C</div>
          </div>
          <div class="current-details">
              <h3>${current.weather[0].description}</h3>
              <p>Wind: ${(current.wind_speed * 3.6).toFixed(1)} km/h ${windDirection(current.wind_deg)}</p>
              <p>Precipitation Chance: ${data.daily[0].pop * 100}%</p>
          </div>
      `;

      // 7-Day Forecast
      forecastContainer.innerHTML = ''; // Clear previous
      const forecast7Day = data.daily.slice(1, 8);
      forecast7Day.forEach(day => {
          forecastContainer.innerHTML += `
              <div class="forecast-day-compact">
                  <p><strong>${new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' })}</strong></p>
                  <i class="wi ${getWeatherIcon(day.weather[0].id)}"></i>
                  <p>${day.temp.day.toFixed(1)}°C</p>
              </div>
          `;
      });

      // Wind Chart
      renderWindChart(data.daily);
  }

  function renderWindChart(dailyForecast) {
      const ctx = document.getElementById('wind-chart').getContext('2d');
      
      const windLabels = dailyForecast.map(day => new Date(day.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }));
      const windSpeeds = dailyForecast.map(day => (day.wind_speed * 3.6).toFixed(1));
      const backgroundColors = windSpeeds.map(speed => speed < 20 ? 'rgba(40, 167, 69, 0.2)' : 'rgba(75, 192, 192, 0.2)');
      const borderColors = windSpeeds.map(speed => speed < 20 ? 'rgba(40, 167, 69, 1)' : 'rgba(75, 192, 192, 1)');

      if (windChartInstance) {
          windChartInstance.destroy();
      }

      windChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
              labels: windLabels,
              datasets: [{
                  label: 'Wind Speed (km/h)',
                  data: windSpeeds,
                  backgroundColor: backgroundColors,
                  borderColor: borderColors,
                  borderWidth: 1
              }]
          },
          plugins: [ChartDataLabels],
          options: {
              maintainAspectRatio: false,
              scales: {
                  y: { beginAtZero: true }
              },
              plugins: {
                  datalabels: {
                      anchor: 'center',
                      align: 'center',
                      formatter: (value, context) => {
                          const deg = dailyForecast[context.dataIndex].wind_deg;
                          return degToArrow(deg);
                      },
                      font: {
                          size: 36,
                          weight: 'bold'
                      },
                      color: '#000'
                  },
                  annotation: {
                      annotations: {
                          line1: {
                              type: 'line',
                              yMin: 20,
                              yMax: 20,
                              borderColor: 'rgb(255, 99, 132)',
                              borderWidth: 3,
                              label: {
                                  content: 'Safe Wind Speeds',
                                  enabled: true,
                                  position: 'end'
                              }
                          },
                          line2: {
                              type: 'line',
                              yMin: 15,
                              yMax: 15,
                              borderColor: 'rgb(40, 167, 69)',
                              borderWidth: 2,
                              label: {
                                  content: 'Optimal Wind Speeds',
                                  enabled: true,
                                  position: 'start'
                              }
                          }
                      }
                  }
              }
          }
      });
  }

  fetch('/api/weather')
    .then(r => r.json())
    .then(data => {
        renderWeather(data);
    });

    function windDirection(degrees) {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      return directions[Math.round(degrees / 45) % 8];
    }
    
    function getWeatherIcon(weatherId) {
      if (weatherId >= 200 && weatherId < 300) return 'wi-thunderstorm';
      if (weatherId >= 300 && weatherId < 400) return 'wi-sprinkle';
      if (weatherId >= 500 && weatherId < 600) return 'wi-rain';
      if (weatherId >= 600 && weatherId < 700) return 'wi-snow';
      if (weatherId >= 700 && weatherId < 800) return 'wi-fog';
      if (weatherId === 800) return 'wi-day-sunny';
      if (weatherId === 801) return 'wi-day-cloudy';
      if (weatherId > 801) return 'wi-cloudy';
      return 'wi-na';
    }
});
