FROM node
ENV BOT_API_KEY xoxb-32654916690-9zACEbjiRC3h6tuahhf4tn26
ADD . /bot
WORKDIR /bot
RUN npm install 
CMD npm start
