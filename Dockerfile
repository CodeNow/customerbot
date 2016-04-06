FROM node
ENV BOT_API_KEY xoxb-32654916690-9zACEbjiRC3h6tuahhf4tn26
ADD package.json /bot/package.json
WORKDIR /bot
RUN npm install
ADD . .
MD node index.js
