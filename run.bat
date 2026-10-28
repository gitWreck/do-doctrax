@echo off
title DO-DocTrax Server
echo Starting DO-DocTrax: CFNR Document Tracking System...
start http://localhost:8000
python server.py 8000
pause
