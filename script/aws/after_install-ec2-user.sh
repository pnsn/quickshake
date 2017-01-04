#!/bin/bash
set -e
set -o pipefail
#after code has been installed  run this shat
rm -rf /var/www/quickshake
mv /var/www/tmp /var/www/quickshake
cd /var/www/quickshake
npm install
