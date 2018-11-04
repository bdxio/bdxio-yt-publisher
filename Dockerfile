FROM node:10.13.0 AS build

WORKDIR /app

COPY . /app

RUN npm install

FROM jrottenberg/ffmpeg:4.0-ubuntu

RUN apt-get update \
    && apt-get install -y curl

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash - \
    && apt-get install -y nodejs

RUN curl -sL https://yt-dl.org/latest/youtube-dl -o /usr/local/bin/youtube-dl \
    && chmod a+x /usr/local/bin/youtube-dl

COPY --from=build /app /app

VOLUME ["/app/assets", "/app/config", "/app/videos"]

EXPOSE 5000

ENV NODE_ENV production

WORKDIR /app

CMD ["start"]
ENTRYPOINT ["npm"]
