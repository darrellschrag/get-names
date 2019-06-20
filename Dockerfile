FROM node:6.16.0-alpine

COPY views /app/views
COPY package.json /app
COPY server.js /app
COPY VERSION /app

RUN cd /app; npm install

ENV PORT 8080
EXPOSE 8080

WORKDIR /app
CMD [ "npm", "start" ]
