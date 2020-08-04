FROM node:14.7.0-stretch
RUN apt-get update -qq && apt-get install -y build-essential
WORKDIR /quickshake
ADD package.json /quickshake/package.json
# RUN npm install
EXPOSE 8888
