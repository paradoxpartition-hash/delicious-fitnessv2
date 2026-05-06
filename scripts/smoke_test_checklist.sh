#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://delicious-fitnessv2-web.vercel.app}"
STRICT="${STRICT:-0}"

routes=("/" "/community" "/profile" "/saved-recipes" "/settings")
failures=0
warnings=0

echo "Smoke test target: ${BASE_URL}"
echo "Strict mode: ${STRICT}"
echo

for route in "${routes[@]}"; do
  url="${BASE_URL}${route}"
  echo "==> ${url}"
  status=$(curl -sS -L -o /tmp/smoke_body.txt -w "%{http_code}" "$url")
  echo "HTTP ${status}"

  case "$route" in
    "/"|"/community")
      if [[ "$status" == "200" ]]; then
        echo "PASS: public route OK"
      else
        echo "FAIL: expected 200 for public route"
        failures=$((failures+1))
      fi
      ;;
    "/profile"|"/saved-recipes")
      if [[ "$status" == "200" || "$status" == "401" || "$status" == "403" ]]; then
        echo "PASS: protected route responded"
      else
        echo "WARN: unexpected status for protected route"
        warnings=$((warnings+1))
      fi
      ;;
    "/settings")
      if [[ "$status" == "200" || "$status" == "404" ]]; then
        echo "PASS: settings route check complete"
      else
        echo "WARN: unexpected status for settings route"
        warnings=$((warnings+1))
      fi
      ;;
  esac

  if grep -Eqi "loading|skeleton" /tmp/smoke_body.txt; then
    echo "WARN: response contains loading/skeleton markers"
    warnings=$((warnings+1))
  fi

  echo
done

echo "Summary: failures=${failures}, warnings=${warnings}"
echo "Manual checks still required: login, dropdown navigation, sign out behavior."

if [[ "$STRICT" == "1" && ( "$failures" -gt 0 || "$warnings" -gt 0 ) ]]; then
  exit 1
fi

if [[ "$failures" -gt 0 ]]; then
  exit 1
fi
