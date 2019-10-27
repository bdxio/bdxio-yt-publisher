FROM node:12 AS build

WORKDIR /app

COPY package.json /app/package.json
RUN npm install

COPY . /app

FROM jrottenberg/ffmpeg:4.2-ubuntu

RUN apt-get update \
    && apt-get install -y curl

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash - \
    && apt-get install -y nodejs

RUN curl -sL https://yt-dl.org/latest/youtube-dl -o /usr/local/bin/youtube-dl \
    && chmod a+x /usr/local/bin/youtube-dl

VOLUME ["/app/assets", "/app/config", "/app/videos"]

EXPOSE 5000

ENV NODE_ENV production

WORKDIR /app

CMD ["start"]
ENTRYPOINT ["npm"]

COPY --from=build /app /app
