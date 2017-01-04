#!/bin/bash
set -e
set -o pipefail
cd /var/www/quickshake
npm install -g  pm2
/usr/bin/pm2 kill