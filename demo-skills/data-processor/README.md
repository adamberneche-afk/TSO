# Data Processor Skill

Powerful utilities for transforming, filtering, and analyzing JSON data.

## Features

- ✅ **Filter** - Query data with complex criteria and operators
- ✅ **Transform** - Map and reshape data structures
- ✅ **Aggregate** - Calculate metrics and group data
- ✅ **Validate** - Schema validation with detailed error reporting
- ✅ **Export** - Convert to JSON, CSV, or TSV formats
- ✅ **Sort & Unique** - Advanced sorting and deduplication
- ✅ **Flatten** - Handle nested data structures

## Installation

```bash
tais install data-processor
```

## Usage

### Filter Data

```javascript
const DataProcessor = require('data-processor');
const processor = new DataProcessor();

const users = [
  { name: 'Alice', age: 30, active: true },
  { name: 'Bob', age: 25, active: false },
  { name: 'Charlie', age: 35, active: true }
];

// Simple filter
const activeUsers = processor.filter(users, { active: true });

// Filter with operators
const adults = processor.filter(users, {
  age: { $gte: 30 }
});
```

### Transform Data

```javascript
const mapping = {
  fullName: 'name',
  yearsOld: 'age',
  status: (item) => item.active ? 'active' : 'inactive',
  joinedAt: {
    from: 'created_at',
    format: 'date'
  }
};

const transformed = processor.transform(users, mapping);
```

### Aggregate Data

```javascript
const sales = [
  { category: 'electronics', amount: 100, region: 'US' },
  { category: 'electronics', amount: 200, region: 'US' },
  { category: 'clothing', amount: 50, region: 'EU' }
];

const report = processor.aggregate(sales, {
  groupBy: 'category',
  metrics: {
    totalSales: { field: 'amount', operation: 'sum' },
    avgSale: { field: 'amount', operation: 'avg' },
    count: { field: 'amount', operation: 'count' }
  }
});

console.log(report);
// {
//   electronics: { totalSales: 300, avgSale: 150, count: 2 },
//   clothing: { totalSales: 50, avgSale: 50, count: 1 }
// }
```

### Validate Data

```javascript
const schema = {
  name: { required: true, type: 'string' },
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  age: { required: true, type: 'number', min: 0, max: 150 }
};

const result = processor.validate(users, schema);
console.log(result.valid); // true/false
console.log(result.errors); // Array of validation errors
```

### Export Data

```javascript
// Export to CSV
const csv = processor.export(users, 'csv');
console.log(csv);
// name,age,active
// Alice,30,true
// Bob,25,false

// Export to JSON
const json = processor.export(users, 'json');
```

## API Reference

### `filter(data, criteria)`

Filter array based on criteria. Supports operators: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$regex`

### `transform(data, mapping)`

Transform data structure. Mapping supports:
- String: Field path
- Function: Transformation function
- Object: Complex mapping with `from`, `default`, `format`

### `aggregate(data, config)`

Aggregate data with grouping and metrics. Operations: `sum`, `avg`, `min`, `max`, `count`, `unique`

### `sort(data, fields, orders)`

Sort data by multiple fields. Orders can be 'asc' or 'desc'.

### `unique(data, key)`

Remove duplicates based on key.

### `flatten(data, separator)`

Flatten nested objects with dot notation.

### `validate(data, schema)`

Validate data against schema. Returns `{ valid, errors, totalChecked }`

### `export(data, format)`

Export to 'json', 'csv', or 'tsv' formats.

## Supported Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$eq` | Equal | `{ age: { $eq: 30 } }` |
| `$ne` | Not equal | `{ status: { $ne: 'inactive' } }` |
| `$gt` | Greater than | `{ score: { $gt: 100 } }` |
| `$gte` | Greater than or equal | `{ age: { $gte: 18 } }` |
| `$lt` | Less than | `{ price: { $lt: 50 } }` |
| `$lte` | Less than or equal | `{ quantity: { $lte: 10 } }` |
| `$in` | In array | `{ status: { $in: ['active', 'pending'] } }` |
| `$nin` | Not in array | `{ role: { $nin: ['admin', 'moderator'] } }` |
| `$regex` | Match regex | `{ email: { $regex: '@company.com$' } }` |

## Permissions

This skill requires:

- **Filesystem Access**: 
  - Read: `/data/input`
  - Write: `/data/output`, `/tmp`
- **Modules**: `lodash`, `moment`
- **Network**: None (offline processing)

## Trust Score

**Current Trust Score:** 0.92

- ✅ Publisher NFT verified
- ✅ 2 community audits passed
- ✅ 1,800+ downloads
- ✅ No external network calls (safe)

## Changelog

### v2.0.1
- Added flatten method for nested objects
- Improved error messages
- Performance optimizations

### v2.0.0
- Added data validation with schema support
- Added export formats (CSV, TSV)
- Breaking: Changed transform API

### v1.1.0
- Added aggregation functions
- Added sort and unique methods
- More operator support

### v1.0.0
- Initial release
- Filter and transform support

## License

MIT License - See LICENSE file

## Support

For issues or questions, please open an issue on GitHub.

## Examples

See the `/examples` directory for more usage examples including:
- E-commerce data processing
- Log analysis
- User analytics
- Report generation