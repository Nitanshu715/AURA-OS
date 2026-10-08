#!/bin/sh
echo "======================================================="
echo "   [+] STARTING AURA-OS CYBERNETIC RUNTIME (LINUX)"
echo "======================================================="
export AURA_PORT=8888
python3 "$(dirname "$0")/server.py"