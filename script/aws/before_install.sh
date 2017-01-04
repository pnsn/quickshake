#!/bin/bash
#this file provisions server and copyies config files from s3
set -e
set -o pipefail

#used to ensure we don't accidently deploy to the production
production_elb="quickshake-production"
#run update but don't update the mysql packages
# since mysql2 gem will not compile  
. $(dirname $0)/common_functions_pnsn.sh

instance_id=$(get_instance_id)

#don't deploy to production instance

if is_instance_production $instance_id $production_elb; then
   echo "Instance $instance_id is part of ASG $DEPLOYMENT_GROUP_NAME and behind elb $production_elb. Halting deployment"
   exit 1
fi


cd /var/www
mkdir -p /var/www/tmp

#ensure there isn't an existing file here
rm -rf /var/www/tmp/*

#install database.yml
# aws s3 cp s3://pnsn-config/bash/pnsn.sh  /etc/profile.d

#add deployment group name to env 
sed -i  "s|^export DEPLOYMENT_GROUP_NAME=.*|export DEPLOYMENT_GROUP_NAME=$DEPLOYMENT_GROUP_NAME|" /etc/profile.d/pnsn.sh

# aws s3 cp s3://pnsn-config/bash/pnsn-secret.sh  /etc/profile.d
