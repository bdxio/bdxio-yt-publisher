#!/usr/bin/env sh

docker container run \
    --publish 5000:5000 \
    --volume ${PWD}/talks.csv:/app/talks.csv \
    --volume ${PWD}/assets:/app/assets \
    --volume ${PWD}/config:/app/config \
    --volume ${PWD}/videos:/app/videos \
    --volume ${PWD}/ffmpeg.args:/app/ffmpeg.args \
    --volume ${PWD}/youtube-dl.args:/app/youtube-dl.args
    --rm \
    bdxio/bdxio-yt-publisher:latest
