@echo off
REM TAIS CLI Demo Script for Windows
REM Demonstrates all CLI commands with mock data

echo 🚀 TAIS CLI Demo
echo ================

REM Create a mock skill directory for testing
mkdir demo-skill
(
echo {
echo   "name": "demo-skill",
echo   "version": "1.0.0",
echo   "author": "0x1234567890123456789012345678901234567890",
echo   "skill_hash": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
echo   "permissions": {
echo     "network": { "domains": ["api.example.com"] },
echo     "filesystem": { "read": ["/tmp"], "write": [] },
echo     "env_vars": [],
echo     "modules": ["axios", "lodash"]
echo   }
echo }
) > demo-skill\manifest.json

echo 📦 Creating mock skill...
echo ✅ Demo skill created

REM Create .tais directory and mock installed skills
mkdir .tais\skills
(
echo [
echo   {
echo     "name": "weather-skill",
echo     "version": "1.2.0",
echo     "author": "0x1234567890123456789012345678901234567890",
echo     "skill_hash": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
echo     "risk_level": "low",
echo     "trust_score": 0.85,
echo     "installed_at": "2024-01-15T10:30:00Z",
echo     "permissions": {
echo       "network": { "domains": ["api.weather.com"] },
echo       "filesystem": { "read": [], "write": [] },
echo       "env_vars": [],
echo       "modules": ["axios"]
echo     }
echo   },
echo   {
echo     "name": "data-processor",
echo     "version": "2.0.0",
echo     "author": "0x9876543210987654321098765432109876543210",
echo     "skill_hash": "fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
echo     "risk_level": "medium",
echo     "trust_score": 0.72,
echo     "installed_at": "2024-01-10T14:22:00Z",
echo     "permissions": {
echo       "network": { "domains": ["api.data.com", "backup.data.com"] },
echo       "filesystem": { "read": ["/data"], "write": ["/tmp"] },
echo       "env_vars": ["API_KEY"],
echo       "modules": ["pandas", "requests", "numpy"]
echo     }
echo   }
echo ]
) > .tais\skills.json

echo 📋 Setting up mock installed skills...
echo ✅ Mock environment ready

echo.
echo 🎯 Demo Commands:
echo ================

echo.
echo 1️⃣  List installed skills:
echo    tais list
node dist\index.js list

echo.
echo 2️⃣  List with verbose output:
echo    tais list --verbose
node dist\index.js list --verbose

echo.
echo 3️⃣  List by risk level:
echo    tais list --risk
node dist\index.js list --risk

echo.
echo 4️⃣  Verify skill security:
echo    tais verify 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
node dist\index.js verify 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

echo.
echo 5️⃣  Verify author:
echo    tais verify --author 0x1234567890123456789012345678901234567890
node dist\index.js verify --author 0x1234567890123456789012345678901234567890

echo.
echo 6️⃣  Configuration management:
echo    tais config --list
node dist\index.js config --list

echo.
echo 7️⃣  Set configuration:
echo    tais config --set auto_approve_low_risk=true
node dist\index.js config --set auto_approve_low_risk=true

echo.
echo 8️⃣  Get configuration:
echo    tais config --get auto_approve_low_risk
node dist\index.js config --get auto_approve_low_risk

echo.
echo 9️⃣  Install demo skill (interactive - will show prompts):
echo    tais install demo-skill
echo    (Skipping interactive demo - run manually to test)

echo.
echo 🔟  Remove skill (interactive - will show prompts):
echo    tais remove weather-skill
echo    (Skipping interactive demo - run manually to test)

echo.
echo 📊 Audit demo (interactive - will show prompts):
echo    tais audit 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
echo    (Skipping interactive demo - run manually to test)

echo.
echo ✅ Demo completed!
echo.
echo 📚 Available commands:
echo    tais install ^<skill^>     - Install skill with security checks
echo    tais list                - List installed skills
echo    tais remove ^<skill^>      - Remove installed skill
echo    tais verify ^<target^>     - Verify skill or author
echo    tais audit ^<skill^>       - Submit security audit
echo    tais config              - Manage configuration
echo.
echo 🔧 Try interactive commands:
echo    tais install demo-skill
echo    tais remove weather-skill
echo    tais config
echo.
echo 🧹 Cleanup: rmdir /s /q demo-skill .tais