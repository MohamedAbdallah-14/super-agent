#!/bin/bash
# Demo commands for terminal recording
# This script is called by record-demo.sh via asciinema

echo "$ superagent doctor"
npx superagent doctor
sleep 2

echo ""
echo "$ superagent export build"
npx superagent export build
sleep 2

echo ""
echo "$ superagent index build"
npx superagent index build
sleep 1
