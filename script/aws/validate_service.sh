#!/bin/bash

. $(dirname $0)/common_functions_pnsn.sh

#add validation shit here
#we want a 200 here...
response=$(curl -s -o /dev/null -I -w "%{http_code}" http://localhost/)
if [ $response -ne 200 ]
then
  $(rollback_deploy)
  exit 1
else
  #remove the older dirs
  $(delete_old_versions)
fi