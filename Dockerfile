FROM node:5.5
RUN apt-get update -qq && apt-get install -y build-essential
WORKDIR /quickshake
ADD package.json /quickshake/package.json
RUN npm install
EXPOSE 8888

