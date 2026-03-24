const fc = require('fast-check');

// Test 1: Ethereum address validation invariant
test('Ethereum addresses should be valid hexadecimal strings of correct length', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 40, maxLength: 42 }),
      (address) => {
        // Remove 0x prefix if present
        const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
        // Should be exactly 40 hex characters
        return /^[0-9a-fA-F]{40}$/.test(cleanAddress);
      }
    )
  );
});

// Test 2: Wei value should be non-negative
test('Wei values should be non-negative integers', () => {
  fc.assert(
    fc.property(
      fc.integer(),
      (value) => {
        // Convert to wei (multiply by 10^18) and check it's non-negative
        const weiValue = value * Math.pow(10, 18);
        return weiValue >= 0;
      }
    )
  );
});

// Test 3: JSON parsing should not throw for valid JSON strings
test('Valid JSON strings should parse without throwing', () => {
  fc.assert(
    fc.property(
      fc.json(),
      (jsonObj) => {
        const jsonString = JSON.stringify(jsonObj);
        try {
          JSON.parse(jsonString);
          return true;
        } catch (e) {
          return false;
        }
      }
    )
  );
});

// Test 4: Array lengths should be non-negative
test('Array lengths should be non-negative', () => {
  fc.assert(
    fc.property(
      fc.array(fc.anything(), { minLength: 0, maxLength: 100 }),
      (arr) => {
        return arr.length >= 0;
      }
    )
  );
});

// Test 5: Object keys should be strings
test('Object keys should be strings', () => {
  fc.assert(
    fc.property(
      fc.record({ [fc.string()]: fc.anything() }, { keys: fc.string() }),
      (obj) => {
        return Object.keys(obj).every(key => typeof key === 'string');
      }
    )
  );
});

// Test 6: Numeric IDs should be positive
test('Database IDs should be positive integers', () => {
  fc.assert(
    fc.property(
      fc.nat(), // natural numbers (0, 1, 2, ...)
      (id) => {
        // IDs should be positive (greater than 0)
        return id > 0;
      }
    )
  );
});

// Test 7: Percentages should be between 0 and 100
test('Percentage values should be between 0 and 100', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0, max: 100 }),
      (percentage) => {
        return percentage >= 0 && percentage <= 100;
      }
    )
  );
});

// Test 8: Slippage tolerance should be reasonable
test('Slippage tolerance should be between 0 and 50 percent', () => {
  fc.assert(
    fc.property(
      fc.float({ min: 0, max: 50 }),
      (slippage) => {
        return slippage >= 0 && slippage <= 50;
      }
    )
  );
});
