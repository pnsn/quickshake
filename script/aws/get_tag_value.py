#!/user/bin/python

#fail, this works but there is a much easier way of doing this

#pass in instance id, region and tag name and get value
import sys, boto3, re
if len(sys.argv) < 4:
 print "get_tag_value.py <instance_id> <region> <tag_name>"
 exit(1)
instance_id = sys.argv[1]
#trim off the trailing digit on region if it exists
region = re.search('\w{2}-\w{4}-\w{1}', sys.argv[2])
if region is not None:
    region = region.group(0)
else:
    sys.exit("could not find region. Args=%s" %sys.argv)
tag_name = sys.argv[3]



ec2=boto3.resource("ec2",region_name=region)
instance = ec2.Instance(instance_id)
tags = instance.tags
#print tags
value = None
for tag in tags:
  if tag["Key"] == tag_name:
    value = tag["Value"]
print value
