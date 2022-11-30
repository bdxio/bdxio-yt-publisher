FROM node:18 AS build

WORKDIR /app

COPY package.json /app/package.json
RUN npm install

COPY . /app

FROM jrottenberg/ffmpeg:5.1-ubuntu

RUN apt-get update \
    && apt-get install -y curl

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

RUN curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/download/2022.11.11/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

VOLUME ["/app/assets", "/app/config", "/app/videos"]

EXPOSE 5000

ENV NODE_ENV production

WORKDIR /app

CMD ["start"]
ENTRYPOINT ["npm"]

COPY --from=build /app /app
