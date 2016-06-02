FROM node
ADD package.json /bot/package.json
WORKDIR /bot
RUN npm install
ADD . .
CMD node index.js
