#!/usr/bin/env bash

set -euo pipefail

version="$(node -p "require('./package.json').version")"
shopt -s nullglob
artifacts=(release/CyberXShot-"${version}"-*.dmg)

if [[ ${#artifacts[@]} -eq 0 ]]; then
  echo "No CyberXShot ${version} DMG artifact was found." >&2
  exit 1
fi

for artifact in "${artifacts[@]}"; do
  credentials=()
  if [[ -n "${APPLE_KEYCHAIN_PROFILE:-}" ]]; then
    credentials+=(--keychain-profile "$APPLE_KEYCHAIN_PROFILE")
  elif [[ -n "${APPLE_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" && -n "${APPLE_TEAM_ID:-}" ]]; then
    credentials+=(
      --apple-id "$APPLE_ID"
      --password "$APPLE_APP_SPECIFIC_PASSWORD"
      --team-id "$APPLE_TEAM_ID"
    )
  else
    echo "Apple notarization credentials are missing." >&2
    exit 1
  fi

  xcrun notarytool submit "$artifact" "${credentials[@]}" --wait --output-format json
  xcrun stapler staple "$artifact"
  xcrun stapler validate "$artifact"
  codesign --verify --verbose=2 "$artifact"
  spctl --assess --verbose=2 --type open --context context:primary-signature "$artifact"
done
