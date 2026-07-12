#!/usr/bin/env bash
# Starts the isolated dev environment (Supabase stack + Next.js dev server)
# for a revision session. Uses its own database, separate from production --
# see .env.development.local and /opt/speaking_pro_dev/supabase/config.toml.
# Tear down with scripts/dev-down.sh when done to free RAM/CPU.
set -euo pipefail

DEV_PORTS=(54371 54372 54373)

echo "== starting dev Supabase stack (speaking_pro_dev) =="
sudo supabase start --workdir /opt/speaking_pro_dev

# The Supabase CLI binds every service to 0.0.0.0 with no auth on Studio and
# default demo credentials -- block non-loopback access to those ports for
# as long as this dev stack is up. Removed again by dev-down.sh.
echo "== firewalling dev ports (54371-54373) to loopback only =="
for port in "${DEV_PORTS[@]}"; do
  rule=(INPUT -p tcp --dport "$port" '!' -i lo -j DROP)
  sudo iptables -C "${rule[@]}" 2>/dev/null || sudo iptables -I "${rule[@]}"
done

echo "== starting dev Next.js instance (:3350) =="
sudo systemctl start speaking-pro-web-dev

echo
echo "Ready. From your machine, tunnel in with:"
echo "  ssh -L 3350:localhost:3350 -L 54373:localhost:54373 <user>@<host>"
echo "Then open http://localhost:3350 (app) and http://localhost:54373 (Supabase Studio)."
echo "Run scripts/dev-down.sh when you're done."
