FROM node:6.16.0-alpine

RUN apk add --no-cache --virtual run-dependencies --update libc6-compat

COPY views /app/views
COPY package.json /app
COPY server.js /app
COPY VERSION /app

RUN cd /app; npm install

ENV PORT 8080
ENV LD_LIBRARY_PATH /app/node_modules/appmetrics
EXPOSE 8080

WORKDIR /app
CMD [ "npm", "start" ]
