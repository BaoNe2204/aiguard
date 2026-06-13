@echo off
setlocal
set "ROOT=%~dp0"
set "DIST=%ROOT%dist"

if not exist "%DIST%" mkdir "%DIST%"

for %%F in (
  manifest.json
  background.js
  content.js
  options.html
  options.js
  popup.html
  popup.js
  blocked.html
  blocked.js
  ui.css
  README.md
) do (
  copy /Y "%ROOT%%%F" "%DIST%\%%F" >nul
)

node --check "%DIST%\background.js" || exit /b 1
node --check "%DIST%\content.js" || exit /b 1
node --check "%DIST%\options.js" || exit /b 1
node --check "%DIST%\popup.js" || exit /b 1

echo AIGuard extension is ready:
echo %DIST%
endlocal
