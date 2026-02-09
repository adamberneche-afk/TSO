/**
 * Crypto Price Skill
 * Get real-time cryptocurrency prices and market data
 */

const axios = require('axios');

class CryptoPrice {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.COINGECKO_API_KEY;
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.cache = new Map();
    this.cacheTimeout = 60 * 1000; // 60 seconds for price data
  }

  /**
   * Get current price for a cryptocurrency
   * @param {string} id - Coin ID (e.g., 'bitcoin', 'ethereum')
   * @param {string} currency - Currency code (default: 'usd')
   * @returns {Object} Price data
   */
  async getPrice(id, currency = 'usd') {
    const cacheKey = `price-${id}-${currency}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await axios.get(`${this.baseURL}/simple/price`, {
        params: {
          ids: id,
          vs_currencies: currency,
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_last_updated_at: true
        },
        headers: this.apiKey ? { 'x-cg-pro-api-key': this.apiKey } : {}
      });

      const data = response.data[id];
      if (!data) {
        throw new Error(`Cryptocurrency '${id}' not found`);
      }

      const priceData = {
        id: id,
        currency: currency,
        price: data[currency],
        market_cap: data[`${currency}_market_cap`],
        volume_24h: data[`${currency}_24h_vol`],
        change_24h: data[`${currency}_24h_change`],
        last_updated: new Date(data.last_updated_at * 1000).toISOString(),
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: priceData,
        timestamp: Date.now()
      });

      return priceData;
    } catch (error) {
      throw new Error(`Failed to fetch price: ${error.message}`);
    }
  }

  /**
   * Get prices for multiple cryptocurrencies
   * @param {Array} ids - Array of coin IDs
   * @param {string} currency - Currency code
   * @returns {Object} Prices for all requested coins
   */
  async getMultiplePrices(ids, currency = 'usd') {
    try {
      const response = await axios.get(`${this.baseURL}/simple/price`, {
        params: {
          ids: ids.join(','),
          vs_currencies: currency,
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true
        },
        headers: this.apiKey ? { 'x-cg-pro-api-key': this.apiKey } : {}
      });

      return Object.entries(response.data).map(([id, data]) => ({
        id,
        currency,
        price: data[currency],
        market_cap: data[`${currency}_market_cap`],
        volume_24h: data[`${currency}_24h_vol`],
        change_24h: data[`${currency}_24h_change`]
      }));
    } catch (error) {
      throw new Error(`Failed to fetch prices: ${error.message}`);
    }
  }

  /**
   * Get detailed coin information
   * @param {string} id - Coin ID
   * @returns {Object} Detailed coin data
   */
  async getCoinInfo(id) {
    try {
      const response = await axios.get(`${this.baseURL}/coins/${id}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false
        },
        headers: this.apiKey ? { 'x-cg-pro-api-key': this.apiKey } : {}
      });

      const coin = response.data;
      
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        description: coin.description?.en || '',
        homepage: coin.links?.homepage?.[0] || '',
        image: coin.image?.large || '',
        market_data: {
          current_price: coin.market_data?.current_price,
          market_cap: coin.market_data?.market_cap,
          total_volume: coin.market_data?.total_volume,
          high_24h: coin.market_data?.high_24h,
          low_24h: coin.market_data?.low_24h,
          price_change_24h: coin.market_data?.price_change_24h,
          price_change_percentage_24h: coin.market_data?.price_change_percentage_24h,
          market_cap_change_24h: coin.market_data?.market_cap_change_24h,
          circulating_supply: coin.market_data?.circulating_supply,
          total_supply: coin.market_data?.total_supply,
          max_supply: coin.market_data?.max_supply
        },
        last_updated: coin.last_updated
      };
    } catch (error) {
      throw new Error(`Failed to fetch coin info: ${error.message}`);
    }
  }

  /**
   * Get top cryptocurrencies by market cap
   * @param {number} limit - Number of coins to return (max 250)
   * @param {string} currency - Currency code
   * @returns {Array} Top coins
   */
  async getTopCoins(limit = 10, currency = 'usd') {
    try {
      const response = await axios.get(`${this.baseURL}/coins/markets`, {
        params: {
          vs_currency: currency,
          order: 'market_cap_desc',
          per_page: Math.min(limit, 250),
          page: 1,
          sparkline: false
        },
        headers: this.apiKey ? { 'x-cg-pro-api-key': this.apiKey } : {}
      });

      return response.data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        current_price: coin.current_price,
        market_cap: coin.market_cap,
        market_cap_rank: coin.market_cap_rank,
        total_volume: coin.total_volume,
        high_24h: coin.high_24h,
        low_24h: coin.low_24h,
        price_change_24h: coin.price_change_24h,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        circulating_supply: coin.circulating_supply,
        total_supply: coin.total_supply,
        ath: coin.ath,
        ath_change_percentage: coin.ath_change_percentage,
        ath_date: coin.ath_date,
        last_updated: coin.last_updated
      }));
    } catch (error) {
      throw new Error(`Failed to fetch top coins: ${error.message}`);
    }
  }

  /**
   * Search for coins
   * @param {string} query - Search query
   * @returns {Array} Matching coins
   */
  async searchCoins(query) {
    try {
      const response = await axios.get(`${this.baseURL}/search`, {
        params: { query },
        headers: this.apiKey ? { 'x-cg-pro-api-key': this.apiKey } : {}
      });

      return response.data.coins.map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        market_cap_rank: coin.market_cap_rank,
        thumb: coin.thumb,
        large: coin.large
      }));
    } catch (error) {
      throw new Error(`Failed to search coins: ${error.message}`);
    }
  }

  /**
   * Get price history for a coin
   * @param {string} id - Coin ID
   * @param {number} days - Number of days of history
   * @param {string} currency - Currency code
   * @returns {Array} Price history
   */
  async getPriceHistory(id, days = 7, currency = 'usd') {
    try {
      const response = await axios.get(`${this.baseURL}/coins/${id}/market_chart`, {
        params: {
          vs_currency: currency,
          days: days
        },
        headers: this.apiKey ? { 'x-cg-pro-api-key': this.apiKey } : {}
      });

      const prices = response.data.prices;
      
      return prices.map(([timestamp, price]) => ({
        timestamp: new Date(timestamp).toISOString(),
        price: price
      }));
    } catch (error) {
      throw new Error(`Failed to fetch price history: ${error.message}`);
    }
  }

  /**
   * Convert amount between cryptocurrencies
   * @param {number} amount - Amount to convert
   * @param {string} from - From coin ID
   * @param {string} to - To coin ID
   * @returns {Object} Conversion result
   */
  async convert(amount, from, to) {
    try {
      const prices = await this.getMultiplePrices([from, to], 'usd');
      
      const fromPrice = prices.find(p => p.id === from)?.price;
      const toPrice = prices.find(p => p.id === to)?.price;
      
      if (!fromPrice || !toPrice) {
        throw new Error('Unable to get conversion rates');
      }

      const convertedAmount = (amount * fromPrice) / toPrice;

      return {
        amount: amount,
        from: from,
        to: to,
        converted_amount: convertedAmount,
        rate: fromPrice / toPrice,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = CryptoPrice;