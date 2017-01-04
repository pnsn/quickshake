#!/bin/bash
cd /var/www/quickshake 
/usr/bin/pm2 start server.js -i 0 --name quickshake  
