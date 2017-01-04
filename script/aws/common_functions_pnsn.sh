#!/bin/bash

#send an admin message
send_sns_admin(){
  instance_id=$(get_instance_id)
  subject=$1
  message="$2 \n From EC2 $instance_id"
  aws sns publish --topic-arn="arn:aws:sns:us-west-2:904650654993:admin-alert" --subject="$subject" --message="$message" --region='us-west-2'

}

#get instance id of this machine
get_instance_id(){
  #get instance-id
  instance_id=$( curl http://169.254.169.254/latest/meta-data/instance-id -s)
  echo $instance_id
}


#don't deploy to production servers!!!! 
#check to make sure this instance doesn't belong to that elb
is_instance_production() {
    local instance_id=$1
    local elb_name=$2

    echo "Ensuring instance '$instance_id' in not behind load balancer '$elb_name'"



    local elb_instances=$(aws --region $AWS_REGION  elb describe-load-balancers \
        --load-balancer-name $elb_name \
        --query 'LoadBalancerDescriptions[*].Instances[*].InstanceId' \
        --output text)
    echo $elb_instances
    if [ $? == 0 ]; then
        for instance in $elb_instances; do
          if [ $instance == $instance_id ]; then
            echo "found it: $instance"
                return 0
          fi
       done
       echo "Let's deploy this motha!"
       return 1
     fi
}



