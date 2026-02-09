# Crypto Price Skill

Get real-time cryptocurrency prices, market data, and historical information from CoinGecko.

## Features

- ✅ **Real-time Prices** - Current prices for 10,000+ cryptocurrencies
- ✅ **Market Data** - Market cap, volume, supply information
- ✅ **Price History** - Historical price charts (up to 1 year)
- ✅ **Top Coins** - Rankings by market capitalization
- ✅ **Coin Search** - Find coins by name or symbol
- ✅ **Currency Conversion** - Convert between cryptocurrencies
- ✅ **Multi-currency** - USD, EUR, GBP, JPY, and 50+ other currencies
- ✅ **Smart Caching** - 60-second cache for optimal performance

## Installation

```bash
tais install crypto-price
```

## Configuration

Optional: Set your CoinGecko API key for higher rate limits:

```bash
export COINGECKO_API_KEY="your_api_key_here"
```

Get a free API key at: https://www.coingecko.com/en/api

## Usage

### Get Current Price

```javascript
const CryptoPrice = require('crypto-price');
const crypto = new CryptoPrice();

const bitcoin = await crypto.getPrice('bitcoin', 'usd');
console.log(bitcoin);
```

**Output:**
```json
{
  "id": "bitcoin",
  "currency": "usd",
  "price": 43250.50,
  "market_cap": 846523000000,
  "volume_24h": 28500000000,
  "change_24h": 2.35,
  "last_updated": "2024-02-05T20:00:00Z",
  "timestamp": "2024-02-05T20:00:00Z"
}
```

### Get Multiple Prices

```javascript
const coins = ['bitcoin', 'ethereum', 'cardano'];
const prices = await crypto.getMultiplePrices(coins, 'usd');
console.log(prices);
```

### Get Top Coins

```javascript
// Get top 10 cryptocurrencies by market cap
const topCoins = await crypto.getTopCoins(10, 'usd');
console.log(topCoins);
```

### Get Coin Information

```javascript
const info = await crypto.getCoinInfo('ethereum');
console.log(info.description);
console.log(info.market_data.current_price);
```

### Search for Coins

```javascript
const results = await crypto.searchCoins('bit');
// Returns: bitcoin, bitcoin-cash, bitcoin-sv, etc.
```

### Get Price History

```javascript
// Get 30 days of price history
const history = await crypto.getPriceHistory('bitcoin', 30, 'usd');

// Plot or analyze the data
history.forEach(point => {
  console.log(`${point.timestamp}: $${point.price}`);
});
```

### Convert Between Cryptocurrencies

```javascript
// Convert 0.5 BTC to ETH
const conversion = await crypto.convert(0.5, 'bitcoin', 'ethereum');
console.log(conversion);

// Output:
// {
//   amount: 0.5,
//   from: 'bitcoin',
//   to: 'ethereum',
//   converted_amount: 8.3421,
//   rate: 16.6842,
//   timestamp: "2024-02-05T20:00:00Z"
// }
```

## API Reference

### `getPrice(id, currency)`

Get current price for a cryptocurrency.

**Parameters:**
- `id` (string): Coin ID (e.g., 'bitcoin', 'ethereum', 'cardano')
- `currency` (string): Currency code (default: 'usd')

**Returns:** Price data object

### `getMultiplePrices(ids, currency)`

Get prices for multiple coins at once.

**Parameters:**
- `ids` (Array): Array of coin IDs
- `currency` (string): Currency code

### `getCoinInfo(id)`

Get detailed information about a coin.

**Parameters:**
- `id` (string): Coin ID

**Returns:** Object with description, links, and full market data

### `getTopCoins(limit, currency)`

Get top cryptocurrencies by market cap.

**Parameters:**
- `limit` (number): Number of coins (max 250)
- `currency` (string): Currency code

### `searchCoins(query)`

Search for coins by name or symbol.

**Parameters:**
- `query` (string): Search term

### `getPriceHistory(id, days, currency)`

Get historical price data.

**Parameters:**
- `id` (string): Coin ID
- `days` (number): Number of days (1-365)
- `currency` (string): Currency code

### `convert(amount, from, to)`

Convert between cryptocurrencies.

**Parameters:**
- `amount` (number): Amount to convert
- `from` (string): Source coin ID
- `to` (string): Target coin ID

## Supported Cryptocurrencies

10,000+ cryptocurrencies supported including:

- **Bitcoin (BTC)** - `bitcoin`
- **Ethereum (ETH)** - `ethereum`
- **Cardano (ADA)** - `cardano`
- **Solana (SOL)** - `solana`
- **Polkadot (DOT)** - `polkadot`
- **Chainlink (LINK)** - `chainlink`
- **And many more...**

Search for any coin using the `searchCoins()` method.

## Supported Currencies

Fiat currencies: USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, and 40+ more

Cryptocurrencies: BTC, ETH, and all supported coins can be used as base currency

## Rate Limits

- **Free tier**: 10-30 calls/minute (no API key)
- **Paid tier**: 500+ calls/minute (with API key)

This skill includes intelligent caching to minimize API calls.

## Permissions

This skill requires:

- **Network Access**: `api.coingecko.com`
- **Environment Variables**: `COINGECKO_API_KEY` (optional)
- **Modules**: `axios`
- **Filesystem**: `/tmp/crypto-cache` (for caching)

## Trust Score

**Current Trust Score:** 0.78

- ✅ Publisher NFT verified
- ✅ Community audit passed
- ✅ 3,200+ downloads
- ⚠️ Requires external API (CoinGecko)

## Changelog

### v1.1.0
- Added currency conversion feature
- Improved error handling
- Better caching strategy

### v1.0.0
- Initial release
- Real-time price support
- Market data integration
- Price history support

## Data Attribution

Price data provided by [CoinGecko](https://www.coingecko.com/)

## License

MIT License - See LICENSE file

## Support

For issues or feature requests, please open an issue on GitHub.

## Disclaimer

Cryptocurrency prices are volatile and for informational purposes only. This skill does not provide financial advice.