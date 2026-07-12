#!/usr/bin/env bash
# Stops the dev environment started by scripts/dev-up.sh. Dev database data
# is preserved in a docker volume (schema/migrations survive), only the
# running containers + dev Next.js process are torn down to free resources.
set -euo pipefail

DEV_PORTS=(54371 54372 54373)

echo "== stopping dev Next.js instance =="
sudo systemctl stop speaking-pro-web-dev

echo "== stopping dev Supabase stack =="
sudo supabase stop --workdir /opt/speaking_pro_dev

echo "== removing dev port firewall rules =="
for port in "${DEV_PORTS[@]}"; do
  rule=(INPUT -p tcp --dport "$port" '!' -i lo -j DROP)
  if sudo iptables -C "${rule[@]}" 2>/dev/null; then
    sudo iptables -D "${rule[@]}"
  fi
done

free -h
