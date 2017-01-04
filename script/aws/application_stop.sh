#!/bin/bash
set -e
set -o pipefail
cd /var/www/quickshake
/usr/bin/pm2 kill