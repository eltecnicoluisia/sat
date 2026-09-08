@echo off
echo.
echo ========================================================
echo   Configuracion de Dominio Local para SAT (http://sat/)
echo ========================================================
echo.
echo Se va a agregar "sat" a tu archivo de hosts de Windows.
echo.

:: Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrador detectado. Agregando al archivo hosts...
    echo.>> %WINDIR%\System32\drivers\etc\hosts
    echo 127.0.0.1    sat>> %WINDIR%\System32\drivers\etc\hosts
    echo.
    echo Listo. Ya puedes entrar a http://sat/ en tu navegador.
    pause
) else (
    echo [ERROR] No lo ejecutaste como Administrador.
    echo Por favor, cierra esta ventana, haz clic derecho en este archivo
    echo "agregar_sat.bat" y selecciona "Ejecutar como administrador".
    echo.
    pause
)
