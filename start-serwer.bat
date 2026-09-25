@echo off
chcp 65001 >nul
title HandyTools - serwer pobierania (NIE ZAMYKAJ tego okna)
cd /d "%~dp0"
call npm run server
echo.
echo Serwer sie zatrzymal. Nacisnij dowolny klawisz, zeby zamknac okno.
pause >nul
