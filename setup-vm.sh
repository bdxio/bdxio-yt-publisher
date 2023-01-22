#!/usr/bin/env bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -E -
sudo apt update && sudo apt install -y ffmpeg nodejs git tmux
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
git clone https://github.com/bdxio/bdxio-yt-publisher.git
cd bdxio-yt-publisher
npm install
cp config/default.json config/production.json
sed --in-place 's/"download": false/"download": true/' config/production.json
echo "Please copy assets and talks.csv before running NODE_ENV=production npm run start"

