@echo off
cd /d "%~dp0"
mkdir css js js\core js\services js\ui icons 2>nul
if not exist index.html type nul > index.html
if not exist manifest.webmanifest type nul > manifest.webmanifest
if not exist sw.js type nul > sw.js
if not exist config.example.js type nul > config.example.js
if not exist icons\icon.svg type nul > icons\icon.svg
if not exist css\theme.css type nul > css\theme.css
if not exist css\main.css type nul > css\main.css
if not exist css\components.css type nul > css\components.css
if not exist css\animations.css type nul > css\animations.css
if not exist js\main.js type nul > js\main.js
if not exist js\config.js type nul > js\config.js
if not exist js\core\constants.js type nul > js\core\constants.js
if not exist js\core\rules.js type nul > js\core\rules.js
if not exist js\core\ai.js type nul > js\core\ai.js
if not exist js\services\supabase.js type nul > js\services\supabase.js
if not exist js\services\realtime.js type nul > js\services\realtime.js
if not exist js\services\storage.js type nul > js\services\storage.js
if not exist js\ui\board.js type nul > js\ui\board.js
if not exist js\ui\screens.js type nul > js\ui\screens.js
if not exist js\ui\effects.js type nul > js\ui\effects.js
echo.
echo ✅ Pronto! Agora e so abrir cada arquivo e colar o codigo recebido.
pause