# Weather API Skill

Get real-time weather data and forecasts from multiple sources.

## Features

- ✅ Current weather conditions
- ✅ 5-day weather forecast
- ✅ Location-based queries (city name or coordinates)
- ✅ Multiple unit systems (metric, imperial, kelvin)
- ✅ Built-in caching (10-minute TTL)
- ✅ Error handling and retries

## Installation

```bash
tais install weather-api
```

## Configuration

Set your OpenWeatherMap API key:

```bash
export OPENWEATHER_API_KEY="your_api_key_here"
```

Get your free API key at: https://openweathermap.org/api

## Usage

### Get Current Weather

```javascript
const WeatherSkill = require('weather-api');
const weather = new WeatherSkill();

const current = await weather.getCurrentWeather('London', 'metric');
console.log(current);
```

**Output:**
```json
{
  "city": "London",
  "country": "GB",
  "temperature": 15.2,
  "feels_like": 14.8,
  "humidity": 72,
  "pressure": 1015,
  "description": "scattered clouds",
  "icon": "03d",
  "wind_speed": 3.5,
  "timestamp": "2024-02-05T20:00:00Z"
}
```

### Get 5-Day Forecast

```javascript
const forecast = await weather.getForecast('London', 'metric');
console.log(forecast);
```

### Get Weather by Coordinates

```javascript
const weather = await weather.getWeatherByCoords(51.5074, -0.1278);
console.log(weather);
```

## API Reference

### `getCurrentWeather(city, units)`

Get current weather for a city.

**Parameters:**
- `city` (string): City name
- `units` (string): 'metric', 'imperial', or 'kelvin' (default: 'metric')

**Returns:** Weather data object

### `getForecast(city, units)`

Get 5-day forecast for a city.

**Parameters:**
- `city` (string): City name
- `units` (string): 'metric', 'imperial', or 'kelvin' (default: 'metric')

**Returns:** Forecast data object with daily summaries

### `getWeatherByCoords(lat, lon)`

Get weather by geographic coordinates.

**Parameters:**
- `lat` (number): Latitude
- `lon` (number): Longitude

**Returns:** Weather data object

## Permissions

This skill requires:

- **Network Access**: `api.openweathermap.org`
- **Environment Variables**: `OPENWEATHER_API_KEY`
- **Modules**: `axios`, `moment`

## Trust Score

**Current Trust Score:** 0.85

- ✅ Publisher NFT verified
- ✅ Community audit passed
- ✅ 2,500+ downloads
- ✅ 3 external auditors reviewed

## Changelog

### v1.2.0
- Added coordinate-based weather lookup
- Improved caching mechanism
- Better error messages

### v1.1.0
- Added 5-day forecast
- Added metric/imperial/kelvin support
- Performance improvements

### v1.0.0
- Initial release
- Current weather support

## License

MIT License - See LICENSE file

## Support

For issues or questions, please open an issue on GitHub.