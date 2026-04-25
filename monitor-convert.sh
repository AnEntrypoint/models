#!/bin/bash
while true; do
  downloads=$(ls /c/models/downloads/*.glb 2>/dev/null | wc -l)
  converted=$(ls /c/models/converted/*.glb 2>/dev/null | wc -l)
  total=$((downloads + converted))
  percent=$((converted * 100 / total))
  echo "[$(date +'%H:%M:%S')] Progress: $converted/$total ($percent%) — $(tail -1 /c/models/convert.log 2>/dev/null | head -c 60)"
  sleep 60
done
