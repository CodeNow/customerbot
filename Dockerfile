FROM node:6.9.4
MAINTAINER Runnable, Inc

# Cache Node Modules
RUN mkdir /app
WORKDIR /app
ADD package.json /app
RUN npm install -g yarn
RUN yarn install

# Add Repository Files
ADD . /app

# Start CustomerBot
CMD node index.js