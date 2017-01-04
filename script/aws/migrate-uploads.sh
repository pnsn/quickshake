#!/bin/bash

if [ $1 ]
  then 
  environment=$1
else
  echo must provide environment as first argument
  exit 1
fi

scp -r -P 7777 deploy@web4.ess.washington.edu:/www/applications/pnsn_web/production/current/uploads/ /tmp
aws s3 sync /tmp/uploads/000 s3://pnsn-cms-uploads/attachments/000  --region us-west-2