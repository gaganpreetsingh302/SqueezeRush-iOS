#!/bin/sh
set -eu

if [ "${CONFIGURATION:-}" != "Release" ]; then
  exit 0
fi

failed=0

reject() {
  printf '%s\n' "Squeeze Rush Release ad configuration error: $1" >&2
  failed=1
}

validate_identifier() {
  setting_name="$1"
  setting_value="$2"
  setting_pattern="$3"

  if [ -z "$setting_value" ]; then
    reject "$setting_name is missing."
    return
  fi
  case "$setting_value" in
    *3940256099942544*) reject "$setting_name contains Google's sample publisher number." ;;
  esac
  if ! printf '%s' "$setting_value" | /usr/bin/grep -Eq "$setting_pattern"; then
    reject "$setting_name does not match the required AdMob identifier format."
  fi
}

validate_identifier "ADMOB_APP_ID" "${ADMOB_APP_ID:-}" '^ca-app-pub-[0-9]{16}~[0-9]{10}$'
validate_identifier "ADMOB_REWARDED_AD_UNIT_ID" "${ADMOB_REWARDED_AD_UNIT_ID:-}" '^ca-app-pub-[0-9]{16}/[0-9]{10}$'
validate_identifier "ADMOB_INTERSTITIAL_AD_UNIT_ID" "${ADMOB_INTERSTITIAL_AD_UNIT_ID:-}" '^ca-app-pub-[0-9]{16}/[0-9]{10}$'

if [ "${SQUEEZE_RUSH_ADS_RELEASE_APPROVED:-}" != "YES" ]; then
  reject "SQUEEZE_RUSH_ADS_RELEASE_APPROVED must equal YES."
fi

validate_identifier "SQUEEZE_RUSH_REMOVE_ADS_PRODUCT_ID" "${SQUEEZE_RUSH_REMOVE_ADS_PRODUCT_ID:-}" '^[A-Za-z0-9][A-Za-z0-9._-]{2,254}$'

if [ "${SQUEEZE_RUSH_IAP_RELEASE_APPROVED:-}" != "YES" ]; then
  reject "SQUEEZE_RUSH_IAP_RELEASE_APPROVED must equal YES."
fi

if [ "$failed" -ne 0 ]; then
  printf '%s\n' 'Release is intentionally blocked until production AdMob configuration is approved.' >&2
  exit 1
fi
