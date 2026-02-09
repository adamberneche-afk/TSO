/**
 * Weather API Skill
 * Fetches real-time weather data from multiple sources
 */

const axios = require('axios');

class WeatherSkill {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENWEATHER_API_KEY;
    this.baseURL = 'https://api.openweathermap.org/data/2.5';
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Get current weather for a location
   * @param {string} city - City name
   * @param {string} units - 'metric', 'imperial', or 'kelvin'
   * @returns {Object} Weather data
   */
  async getCurrentWeather(city, units = 'metric') {
    const cacheKey = `current-${city}-${units}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await axios.get(`${this.baseURL}/weather`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: units
        }
      });

      const weatherData = {
        city: response.data.name,
        country: response.data.sys.country,
        temperature: response.data.main.temp,
        feels_like: response.data.main.feels_like,
        humidity: response.data.main.humidity,
        pressure: response.data.main.pressure,
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        wind_speed: response.data.wind.speed,
        visibility: response.data.visibility,
        sunrise: new Date(response.data.sys.sunrise * 1000).toISOString(),
        sunset: new Date(response.data.sys.sunset * 1000).toISOString(),
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      throw new Error(`Failed to fetch weather: ${error.message}`);
    }
  }

  /**
   * Get 5-day weather forecast
   * @param {string} city - City name
   * @param {string} units - 'metric', 'imperial', or 'kelvin'
   * @returns {Object} Forecast data
   */
  async getForecast(city, units = 'metric') {
    try {
      const response = await axios.get(`${this.baseURL}/forecast`, {
        params: {
          q: city,
          appid: this.apiKey,
          units: units
        }
      });

      // Group by day
      const dailyForecasts = {};
      
      response.data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toDateString();
        
        if (!dailyForecasts[date]) {
          dailyForecasts[date] = {
            date: date,
            readings: [],
            high: -Infinity,
            low: Infinity
          };
        }

        dailyForecasts[date].readings.push({
          time: new Date(item.dt * 1000).toISOString(),
          temp: item.main.temp,
          description: item.weather[0].description,
          icon: item.weather[0].icon
        });

        dailyForecasts[date].high = Math.max(dailyForecasts[date].high, item.main.temp_max);
        dailyForecasts[date].low = Math.min(dailyForecasts[date].low, item.main.temp_min);
      });

      return {
        city: response.data.city.name,
        country: response.data.city.country,
        forecasts: Object.values(dailyForecasts).slice(0, 5)
      };
    } catch (error) {
      throw new Error(`Failed to fetch forecast: ${error.message}`);
    }
  }

  /**
   * Get weather by coordinates
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Weather data
   */
  async getWeatherByCoords(lat, lon) {
    try {
      const response = await axios.get(`${this.baseURL}/weather`, {
        params: {
          lat: lat,
          lon: lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return {
        city: response.data.name,
        temperature: response.data.main.temp,
        description: response.data.weather[0].description,
        coordinates: { lat, lon },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to fetch weather by coordinates: ${error.message}`);
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = WeatherSkill;