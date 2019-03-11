FROM node:6-alpine

RUN apk add --no-cache --virtual run-dependencies --update libc6-compat

ADD views /app/views
ADD package.json /app
ADD server.js /app

RUN cd /app; npm install

ENV PORT 8080
ENV LD_LIBRARY_PATH /app/node_modules/appmetrics
EXPOSE 8080

WORKDIR /app
CMD [ "npm", "start" ]