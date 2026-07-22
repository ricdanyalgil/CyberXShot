#!/usr/bin/env bash

set -euo pipefail

npm run build
./node_modules/.bin/electron-builder --mac --publish never "$@"
bash scripts/notarize-dmg.sh
