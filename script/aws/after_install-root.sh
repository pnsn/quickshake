#!/bin/bash
set -e
set -o pipefail
#give this shat back to ec2-user
rm -rf /var/www/quickshake
mv /var/www/tmp /var/www/quickshake
chown -R ec2-user:ec2-user  /var/www/quickshake
