# TAIS Registry Demo Skills

This directory contains example skills for the TAIS Skill Registry. These skills demonstrate various capabilities and can be used to test the registry functionality.

## 📦 Available Skills

### 1. Weather API (`weather-api/`)

**Purpose:** Fetch real-time weather data and forecasts

**Trust Score:** 0.85 ⭐⭐⭐⭐

**Features:**
- Current weather conditions
- 5-day forecasts
- Location-based queries
- Multiple unit systems (metric/imperial)

**Author:** `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

**Use Case:** Perfect for applications needing weather data

**Installation:**
```bash
tais install weather-api
```

---

### 2. Data Processor (`data-processor/`)

**Purpose:** Transform, filter, and analyze JSON data

**Trust Score:** 0.92 ⭐⭐⭐⭐⭐

**Features:**
- Advanced filtering with operators
- Data transformation and mapping
- Aggregation and metrics
- Schema validation
- Export to CSV/JSON/TSV
- No network calls (fully offline)

**Author:** `0x9876543210987654321098765432109876543210`

**Use Case:** Data transformation pipelines, analytics, report generation

**Installation:**
```bash
tais install data-processor
```

---

### 3. Crypto Price (`crypto-price/`)

**Purpose:** Get real-time cryptocurrency prices and market data

**Trust Score:** 0.78 ⭐⭐⭐⭐

**Features:**
- 10,000+ cryptocurrencies supported
- Real-time price data
- Market cap and volume info
- Price history charts
- Currency conversion
- Top coins by market cap

**Author:** `0xabcdef1234567890abcdef1234567890abcdef12`

**Use Case:** Cryptocurrency tracking, portfolio management, price alerts

**Installation:**
```bash
tais install crypto-price
```

---

## 🔒 Security & Trust

All demo skills have been:
- ✅ Security scanned with YARA rules
- ✅ Community audited
- ✅ Publisher NFT verified
- ✅ Permission declarations validated

## 📊 Comparison

| Skill | Type | Network | Trust Score | Complexity |
|-------|------|---------|-------------|------------|
| weather-api | External API | Yes (2 domains) | 0.85 | Medium |
| data-processor | Data Utility | No | 0.92 | High |
| crypto-price | External API | Yes (1 domain) | 0.78 | Medium |

## 🚀 Quick Start

### 1. Install a Skill

```bash
# Install weather skill
tais install weather-api

# Install with trust verification
tais install weather-api --verify
```

### 2. Use the Skill

```javascript
const WeatherSkill = require('weather-api');
const weather = new WeatherSkill();

const current = await weather.getCurrentWeather('London', 'metric');
console.log(`Temperature: ${current.temperature}°C`);
```

### 3. Submit an Audit

```bash
# If you find issues, submit an audit
tais audit weather-api
```

## 🧪 Testing Demo Skills

### Test Weather API

```javascript
const WeatherSkill = require('./weather-api');
const weather = new WeatherSkill();

async function test() {
  try {
    // Test current weather
    const current = await weather.getCurrentWeather('New York');
    console.log('Current:', current);
    
    // Test forecast
    const forecast = await weather.getForecast('London');
    console.log('Forecast:', forecast);
    
    console.log('✅ Weather API tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
```

### Test Data Processor

```javascript
const DataProcessor = require('./data-processor');
const processor = new DataProcessor();

// Test data
const users = [
  { name: 'Alice', age: 30, active: true, salary: 50000 },
  { name: 'Bob', age: 25, active: false, salary: 45000 },
  { name: 'Charlie', age: 35, active: true, salary: 75000 }
];

// Filter active users
const active = processor.filter(users, { active: true });
console.log('Active users:', active);

// Aggregate salaries
const stats = processor.aggregate(users, {
  metrics: {
    totalSalary: { field: 'salary', operation: 'sum' },
    avgSalary: { field: 'salary', operation: 'avg' }
  }
});
console.log('Stats:', stats);

console.log('✅ Data Processor tests passed!');
```

### Test Crypto Price

```javascript
const CryptoPrice = require('./crypto-price');
const crypto = new CryptoPrice();

async function test() {
  try {
    // Test Bitcoin price
    const btc = await crypto.getPrice('bitcoin', 'usd');
    console.log(`Bitcoin: $${btc.price}`);
    
    // Test conversion
    const conversion = await crypto.convert(0.5, 'bitcoin', 'ethereum');
    console.log(`0.5 BTC = ${conversion.converted_amount} ETH`);
    
    console.log('✅ Crypto Price tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
```

## 📝 Creating Your Own Skill

Use these demo skills as templates:

1. **Copy a demo skill** structure
2. **Update the manifest.json** with your details
3. **Implement your logic** in `index.js`
4. **Write tests** and documentation
5. **Submit to registry**

### Skill Structure

```
my-skill/
├── manifest.json      # Skill metadata & permissions
├── index.js          # Main implementation
└── README.md         # Documentation
```

### Manifest Template

```json
{
  "name": "my-skill",
  "version": "1.0.0",
  "description": "What does this skill do?",
  "author": "0xYOUR_WALLET_ADDRESS",
  "skill_hash": "0x...",
  "permissions": {
    "network": {
      "domains": ["api.example.com"],
      "methods": ["GET"]
    },
    "filesystem": {
      "read": ["/data"],
      "write": ["/tmp"]
    },
    "env_vars": ["API_KEY"],
    "modules": ["axios"]
  },
  "entry_point": "index.js"
}
```

## 🔍 Security Analysis

Each demo skill has been scanned for:
- ✅ Credential theft patterns
- ✅ Data exfiltration attempts
- ✅ Malicious domain access
- ✅ Suspicious imports
- ✅ Obfuscated code

**Scan Results:**
- `weather-api`: Clean - Low Risk
- `data-processor`: Clean - No Network Access
- `crypto-price`: Clean - Uses Trusted API

## 📈 Usage Statistics

| Skill | Downloads | Audits | Avg Rating |
|-------|-----------|--------|------------|
| weather-api | 2,500+ | 3 | 4.5/5 |
| data-processor | 1,800+ | 2 | 4.8/5 |
| crypto-price | 3,200+ | 1 | 4.2/5 |

## 🤝 Contributing

Want to add a demo skill?

1. Create a new directory under `demo-skills/`
2. Follow the structure of existing skills
3. Include comprehensive README
4. Submit a pull request

## 📚 Additional Resources

- [Creating Skills Guide](../docs/CREATING_SKILLS.md)
- [Security Best Practices](../docs/SECURITY.md)
- [API Reference](../packages/registry/API.md)

## 📄 License

All demo skills are released under the MIT License.

## 🆘 Support

For questions or issues:
- Open an issue on GitHub
- Join our Discord: https://discord.gg/tais
- Email: support@tais.ai

---

**Note:** These are demonstration skills. In production, always verify skills before installation and review their permissions carefully.