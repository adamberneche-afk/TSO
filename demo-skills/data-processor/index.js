/**
 * Data Processor Skill
 * Transform, filter, and analyze JSON data
 */

const _ = require('lodash');
const moment = require('moment');

class DataProcessor {
  constructor(options = {}) {
    this.options = {
      maxArraySize: options.maxArraySize || 10000,
      maxDepth: options.maxDepth || 10,
      enableCache: options.enableCache !== false
    };
    this.cache = new Map();
  }

  /**
   * Filter data based on criteria
   * @param {Array} data - Array of objects
   * @param {Object} criteria - Filter criteria
   * @returns {Array} Filtered data
   */
  filter(data, criteria) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    return data.filter(item => {
      return Object.entries(criteria).every(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          // Handle operators like $gt, $lt, $eq, etc.
          return this._evaluateOperator(item[key], value);
        }
        return item[key] === value;
      });
    });
  }

  /**
   * Transform data structure
   * @param {Array|Object} data - Input data
   * @param {Object} mapping - Field mapping
   * @returns {Array|Object} Transformed data
   */
  transform(data, mapping) {
    const transformItem = (item) => {
      const result = {};
      
      Object.entries(mapping).forEach(([newKey, config]) => {
        if (typeof config === 'string') {
          // Simple field mapping
          result[newKey] = _.get(item, config);
        } else if (typeof config === 'function') {
          // Function transformation
          result[newKey] = config(item);
        } else if (typeof config === 'object') {
          // Complex mapping with default, format, etc.
          let value = _.get(item, config.from);
          
          if (value === undefined && config.default !== undefined) {
            value = config.default;
          }
          
          if (config.format && value !== undefined) {
            value = this._formatValue(value, config.format);
          }
          
          result[newKey] = value;
        }
      });
      
      return result;
    };

    if (Array.isArray(data)) {
      return data.map(transformItem);
    }
    
    return transformItem(data);
  }

  /**
   * Aggregate data
   * @param {Array} data - Array of objects
   * @param {Object} config - Aggregation config
   * @returns {Object} Aggregated results
   */
  aggregate(data, config) {
    const results = {};
    
    if (config.groupBy) {
      const grouped = _.groupBy(data, config.groupBy);
      
      Object.entries(grouped).forEach(([key, items]) => {
        results[key] = this._calculateMetrics(items, config.metrics);
      });
    } else {
      results.overall = this._calculateMetrics(data, config.metrics);
    }
    
    return results;
  }

  /**
   * Sort data
   * @param {Array} data - Array to sort
   * @param {string|Array} fields - Sort fields
   * @param {string|Array} orders - Sort orders ('asc' or 'desc')
   * @returns {Array} Sorted array
   */
  sort(data, fields, orders = 'asc') {
    return _.orderBy(data, fields, orders);
  }

  /**
   * Remove duplicates
   * @param {Array} data - Array with potential duplicates
   * @param {string|Function} key - Key to determine uniqueness
   * @returns {Array} Array with duplicates removed
   */
  unique(data, key) {
    if (key) {
      return _.uniqBy(data, key);
    }
    return _.uniq(data);
  }

  /**
   * Flatten nested data
   * @param {Object} data - Nested object
   * @param {string} separator - Key separator
   * @returns {Object} Flattened object
   */
  flatten(data, separator = '.') {
    return this._flattenObject(data, '', separator, 0);
  }

  /**
   * Validate data against schema
   * @param {Array|Object} data - Data to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation results
   */
  validate(data, schema) {
    const errors = [];
    
    const validateItem = (item, path = '') => {
      Object.entries(schema).forEach(([field, rules]) => {
        const value = _.get(item, field);
        const fieldPath = path ? `${path}.${field}` : field;
        
        if (rules.required && (value === undefined || value === null)) {
          errors.push({
            field: fieldPath,
            error: 'Required field is missing',
            value
          });
        }
        
        if (value !== undefined && value !== null) {
          if (rules.type && typeof value !== rules.type) {
            errors.push({
              field: fieldPath,
              error: `Expected type ${rules.type}, got ${typeof value}`,
              value
            });
          }
          
          if (rules.min !== undefined && value < rules.min) {
            errors.push({
              field: fieldPath,
              error: `Value must be >= ${rules.min}`,
              value
            });
          }
          
          if (rules.max !== undefined && value > rules.max) {
            errors.push({
              field: fieldPath,
              error: `Value must be <= ${rules.max}`,
              value
            });
          }
          
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push({
              field: fieldPath,
              error: 'Value does not match required pattern',
              value
            });
          }
        }
      });
    };
    
    if (Array.isArray(data)) {
      data.forEach((item, index) => validateItem(item, `[${index}]`));
    } else {
      validateItem(data);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      totalChecked: Array.isArray(data) ? data.length : 1
    };
  }

  /**
   * Export data to various formats
   * @param {Array} data - Data to export
   * @param {string} format - 'json', 'csv', 'tsv'
   * @returns {string} Formatted data
   */
  export(data, format = 'json') {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(data, null, 2);
        
      case 'csv':
        return this._toCSV(data);
        
      case 'tsv':
        return this._toCSV(data, '\t');
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Private helper methods
  _evaluateOperator(value, operator) {
    return Object.entries(operator).every(([op, operand]) => {
      switch (op) {
        case '$eq': return value === operand;
        case '$ne': return value !== operand;
        case '$gt': return value > operand;
        case '$gte': return value >= operand;
        case '$lt': return value < operand;
        case '$lte': return value <= operand;
        case '$in': return operand.includes(value);
        case '$nin': return !operand.includes(value);
        case '$regex': return new RegExp(operand).test(value);
        default: return false;
      }
    });
  }

  _formatValue(value, format) {
    switch (format) {
      case 'date':
        return moment(value).format('YYYY-MM-DD');
      case 'datetime':
        return moment(value).format('YYYY-MM-DD HH:mm:ss');
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'number':
        return Number(value);
      default:
        return value;
    }
  }

  _calculateMetrics(items, metrics) {
    const results = {};
    
    Object.entries(metrics).forEach(([name, config]) => {
      const values = items.map(item => _.get(item, config.field));
      
      switch (config.operation) {
        case 'sum':
          results[name] = _.sum(values);
          break;
        case 'avg':
          results[name] = _.mean(values);
          break;
        case 'min':
          results[name] = _.min(values);
          break;
        case 'max':
          results[name] = _.max(values);
          break;
        case 'count':
          results[name] = values.length;
          break;
        case 'unique':
          results[name] = _.uniq(values).length;
          break;
        default:
          results[name] = null;
      }
    });
    
    return results;
  }

  _flattenObject(obj, prefix = '', separator = '.', depth = 0) {
    if (depth > this.options.maxDepth) {
      return { [prefix || 'value']: obj };
    }
    
    return Object.keys(obj).reduce((acc, key) => {
      const pre = prefix.length ? prefix + separator : '';
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(acc, this._flattenObject(obj[key], pre + key, separator, depth + 1));
      } else {
        acc[pre + key] = obj[key];
      }
      
      return acc;
    }, {});
  }

  _toCSV(data, delimiter = ',') {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }
    
    const headers = Object.keys(data[0]);
    const rows = data.map(item => 
      headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(delimiter)) {
          return `"${value}"`;
        }
        return value;
      }).join(delimiter)
    );
    
    return [headers.join(delimiter), ...rows].join('\n');
  }
}

module.exports = DataProcessor;