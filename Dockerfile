FROM node
#ADD package.json /bot/package.json
WORKDIR /bot
ADD . .
RUN npm install
CMD node index.js
