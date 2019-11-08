FROM node:12.13.0-stretch-slim
LABEL maintainer="Senomas <agus@senomas.com>"
RUN apt-get update && apt-get install -y build-essential git python && rm -rf /var/lib/apt/lists/*

WORKDIR /home/node

ADD package.json .
ADD yarn.lock .
RUN yarn --frozen-lockfile

ADD src src
ADD tsconfig.json tsconfig.json
ADD tslint.json tslint.json

RUN npx tsc

CMD [ "node", "dist/server.js" ]
