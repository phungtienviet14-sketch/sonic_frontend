@echo off
setlocal
cd /d "%~dp0"

"C:\Program Files\nodejs\npm.cmd" run dev -- --host 127.0.0.1 --port 5173 > frontend_runtime.out.log 2> frontend_runtime.err.log
