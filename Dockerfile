FROM node
ENV BOT_API_KEY xoxb-32654916690-5lvjbdBlbyZzt0fOcBPhZ49W
ADD package.json /bot/package.json
WORKDIR /bot
RUN npm install
ADD . .
CMD node index.js
