# BDX I/O YouTube publisher

> CLI to publish BDX I/O talks to YouTube.

Every year talks from the [BDX I/O](https://www.bdx.io) conference are streamed live on YouTube.  
Once this is done these streams need to be splitted into individual videos for each talk.

This [Node.js](https://www.nodejs.org) CLI automates this process.

Basically the application:

- downloads the stream for each room
- splits them into invidual video for each talk, according to timestamps given
- adds an intro and an outro to every video
- uploads each video to YouTube
- adds them to an unique playlist

Since January 2019 the YouTube Data API has a daily limit of 10,000 units per day 
(see https://stackoverflow.com/questions/15568405/youtube-api-limitations/15580411#15580411).  
An uploaded video costs 1,600 units (https://developers.google.com/youtube/v3/docs/videos/insert), 
meaning only 6 videos can be uploaded per day.

To bypass this issue another operation has been introduced, activated by setting `tag` to `true` 
in the configuration file.

In this mode you have to follow these steps :

  1. downloads the stream and extract the talks using the app
  2. **manually** upload the extracted talks to YouTube as you won't have any limit (at least not so low as 6 videos)
  3. activate videos tagging and run again the app

Basically the tag mode will :

  - retrieve the uploaded videos (using a specific playlist containing all uploaded videos)
  - create a playlist to add the videos to
  - update the metadata of uploaded videos, setting the title, the description, the license and the privacy status
  - add the updated video to the playlist

The matching between manually uploaded videos and videos to tag is done using the name of the uploaded file, 
which should be the id of the talk in the CFP. In YouTube the uploaded video has by defaut the name of the file as title.  
Be aware that once a video has been tagged it will become impossible to match again the same video, 
as the title of the video will have been updated.

This mode uses way less units than the one uploading automatically the videos :

  - the listing of the user channels costs 1 unit plus 2 units for the `contentDetails` part
  - the listing of the videos of the upload playlist costs 1 unit plus 2 units for the `snippet` part. 
    Depending of the total number of uploaded videos more than one call may be necessary as only 50 results 
    can be returned for each call.
  - the creation of the playlist costs 50 units plus 2 units for the `snippet` part and 2 units for the `status` part
  - the update of each video costs 50 units as well plus 2 units for the `snippet` part and 2 units for the `status` part
  - finally the insertion of each video in the playlist costs 50 units plus 2 units for the `snippet` part

So if you have 50 videos to upload and your channel has 2,500 videos previously uploaded the app will require :
3 units (user channels listing) + 3 units * 50 (50 calls to retrieve the 2,500 uploaded videos) + 
52 units (playlist creation) + 54 units * 50 (50 videos to update) + 
52 units * 50 (50 videos to add to the playlist) = **5505 units**

Basically you should be more or less good as long as you don't need to tag more than 90 videos.  
You can use this calculator to check if you're below 10,000 units : https://developers.google.com/youtube/v3/determine_quota_cost

**Note** : the number of playlists created has an hard limitation, independant of the quota.  
You cannot create more than 10 playlists once a day using the API so don't play too much with the application 😉  
If you have this issue you can always create manually the playlist and change the code to use the hardcoded id 
of your playlist.  
An issue has been created to solve this by configuration.

## Install

If you plan to use Docker just run `./build.sh` to build the image.

Otherwise, you'll need two runtime requirements :

  1. [yt-dlp](https://github.com/yt-dlp/yt-dlp), used to download rooms streams
  2. [ffpmeg](https://ffmpeg.org/) v5.1+, used to extract talks from streams

Then you can install dependencies using `npm install` or `yarn`.

## Usage

To upload videos you'll need to retrieve `client_id` and `client_secret` of the application to authorize access to your YouTube account.  
Go to the [Google developers console](https://console.developers.google.com/), select the application `bdxio-yt-publisher` and select `API > Identifiants`.  
Then select `Node.js` as OAuth 2.0 client and copy/paste the `client_id` and `client_secret` into `config/default.json`.  
If you need to create a new application don't forget to enable the "YouTube Data API v3" API for it.

The second step is to export the CSV file containing all the talks information:
  
  1. Go to the Google Drive account and open the spreadsheet `Talks` located in the folder `5 - Media & Com > Captation vidéo`
  2. Export the sheet for each room as CSV
  3. Paste the CSV files at the root of the project and rename the room you want to handle as `talks.csv`

Check that this sheet contains:
  - title in column `A`
  - speakers in column `B`
  - room in column `D`
  - start and end offsets in columns `E` and `F`
  - cfp id in column `G`
  - video url in column `H`

_invalid rows will be filtered out_

Put the intro and outro files to be added to each video in the [assets](./assets) directory.

Finally, create a configuration file called `production.json` in the `config` directory, using `default.json` as template (see `Configuration` section below for more information).

You can use Docker to run the application, using `run.sh` script.

_Notice that you'll need to manually copy and paste the OAuth authorization URL to give access to your YouTube account_

You can also run the application locally, using `NODE_ENV=production yarn start` to start the processing.  
Upon start the application should ask for access to your Google account, make sure that you select the account which should publish the videos, not your personal Google account (unless you want to make some tests).

**Note**

When the upload of a video is finished you might have to wait some time before the next video is uploaded as YouTube needs to process the uploaded video first.

Once all the videos have been imported you just have to :

  - add all videos to a specific public playlist
  - make them public _(they are private by default in case something goes wrong)_

## Configuration

`config` folder contains configuration files.  
By default `Node.js` runs in development mode so `default.json` then `developmement.json` configuration files are used.  
You can easily add a new configuration file and then start the application using `NODE_ENV` environment variable to use your new configuration file (_default.json will still be loaded first_).

Here is the list of the existing configuration parameters :

```javascript
{
    // The CSV file to use as an input list for the talks to process.
    "csv": "talks.csv",
    // The current year is used by default but you can override it.
    "year": 2019,
    // All rooms are processed by default but you can limit the rooms to process.
    // The room names corresponds to values in the first column in the CSV file.
    "rooms": ["AmphiA", "AmphiB"],
    // CFP URL used to retrieve additional infos for talks (Conference Hall is supported, another CFP would
    // probably require code changes to work).
    "cfpUrl": "<URL>",
    // The ID of the event in Conference Hall, can be retrieved in the settings page.
    "cfpEventId": "Conference Hall event ID",
    // The API key to use to access Conference Hall API.
    "cfpApiKey": "API key for Conference Hall",
    // Download or not the full stream video.
    "download": true/false,
    // Extension to use for downloaded stream video files.
    // Please be aware that it must match the arguments set to download streams using youtube-dl
    // or otherwise there might be a mismatch between the file extension used here and the one youtube-dl used.
    "downloadExt": "mkv",
    // Extract talks from stream video file if set to true.
    "extract": true/false,
    // Path to file containing the arguments used by ffmpeg to split the videos from the original live stream.
    "ffmpegArgs": <FFMPEG_ARGS_PATH>
    // Path to the file to use for the intro (relative to the current directory).
    // You can choose to remove it but in this case don't forget to edit accordingly the ffmpeg command (see below).
    "intro": "<INTRO_PATH>",
    // Path to the file to use for the outro (relative to the current directory).
    // As for the intro you can choose to remove it, edit ffmpeg command to remove reference to it.
    "outro": "<OUTRO_PATH>",
    // Upload extracted talks to YouTube if set to true.
    "upload": true/false,
    // Tag manually uploaded videos if set to true. It should not be used with automatic uploading!
    "tag": true/false,
    // Title for uploaded talks. ${year} will be replaced by the conference year, ${title} by the title of the talks and ${speakers} by the name of the speakers.
    "videoTitle": "BDX I/O ${year} - ${title} - ${speakers}",
    // Title template for the playlist created. It is only used in tagging mode yet.
    "playlistTitle": "Talks BDX I/O ${year}",
    // Configuration for YouTube.
    "youtube": {
        // The category id to apply to uploaded talks.
        // See https://developers.google.com/youtube/v3/docs/videoCategories/list for more info.
        "categoryId": "28",
        // The license to apply to uploaded talks.
        "license": "youtube/creativeCommon",
        // The visibility of the uploaded talks.
        // It is usually a good idea to set them to private first to check first that everything went fine,
        // YouTube allows to mass change visibility of videos.
        // Notice that private status means that you need to be connected to the account
        // having uploaded the video to have access to it.
        "privacyStatus": "private/public/unlisted"
    },
    // Credentials for the Google Application.
    "credentials": {
        // Client ID of the Google application.
        "client_id": "***",
        // Client secret of the Google application.
        "client_secret": "***",
        // Redirect URI to retrieve the access token (for now changing it will break the upload!).
        "redirect_uri": "http://localhost:5000/oauth2callback"
    }
}
```

You may also set the `ffmpeg` arguments used to extract and encode talks from the streams.  
For this you need to edit the file [ffmpeg.args](./ffmpeg.args).

If you just want to split the videos you can use the [ffmpeg-noop.args](./ffmpeg-noop.args) file which only 
extract videos from the stream without any transformation.

If you're running the application on your computer you might want to customize the encoder used in order to use 
available hardware acceleration (this won't work if you're using a Docker container).  
For example on macOS you may replace `libx264` by `h264_videotoolbox` to use [VideoToolbox](https://developer.apple.com/documentation/videotoolbox).

By default, the following arguments are used:
```bash
-y -i "${intro}" -ss ${start} -to ${end} -i "${stream}" -loop 1 -t 7 -framerate 25 -i "${outro}" -t 7 -f lavfi -i anullsrc=r=44100:cl=stereo \
  -filter_complex "[0:v] fade=in:0:25, fade=out:250:25 [faded-intro]; \
  [1:v] fade=in:0:25, fade=out:st=${fadeOutStartTime}:d=1 [faded-talk-video]; \
  [1:a] afade=t=in:ss=0:d=1, afade=t=out:st=${fadeOutStartTime}:d=1 [faded-talk-audio]; \
  [2:v] fade=in:0:25, fade=out:150:25 [faded-outro]; \
  [faded-intro] [0:a] [faded-talk-video] [faded-talk-audio] [faded-outro] [3:a] concat=n=3:v=1:a=1 [v] [a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 17 -c:a aac -b:a 192k "${output}"
```

Basically this adds an intro and an outro (from an image), extract the talk from the stream, add some fade in and fade out effects and outputs to a single file.

The application will replace the variables by their values when executing the command :
  - `${intro}` is the path to the intro file
  - `${start}` and `${end}` are the start and end timestamps of the talk
  - `${stream}` is the path to the stream for the room
  - `${outro}` is the path to the outro file
  - `${fadeOutStartTime}` is the timestamp (in seconds) indicating where to start fading out
  - `${output}` is the path to the extracted talk file

In details (note that in `ffmpeg` options set before an input are relative only to this input):

  - `-y` overwrites the output file
  - `-i` defines an input
  - `-ss` asks `ffmpeg` to start the input at the specified timestamp
  - `-to` asks `ffmpeg` to stop reading the input at the specified timestamp. This parameter and the previous one are doing the actual extraction of the talk.
  - `-loop 1` is used to loop over an image (this option is specific to images muxer and demuxer)
  - `-t 7` limits the duration of the input. In our case it allows to create a video of 7 seconds for the image input
  - `-framerate` defines the framerate of the video generated from the image
  - `-f lavfi` tells `ffmpeg` the format of the next input (libavfilter)
  - `-i anullsrc=r=44100:cl=stereo` defines a null audio input with 2 channels (stereo) and a frequency of 44100 Hz. This is necessary to concatenate streams later as our outro video generated from an image has no sound stream. This is also why we previously told `ffmpeg` the format of the input.
  - `filter_complex` is used to create a complex filter!
  - `[0:v]` selects the video stream of the first video (inputs and streams are indexed from 0, as usual). We can use `v` to mean `video`, `ffmpeg` automatically selects the best video stream and in our case we only have one. Using an index would have been wiser if there had been multiple video streams.
  - `fade=in:0:25, fade=out:250:25` we apply a fade in effet to the 25 first frame and a fade out effect to the last 25 frames
  - `[faded-intro]` the output is called `faded-intro` in order to be reused later
  - `[1:v]` we select the video stream from the second input (the YouTube stream)
  - `fade=in:0:25, fade=out:st=${fadeOutStartTime}:d=1` we apply a fade in and a fade out effects to the video. Contrary to the intro we specify the fade out start time as seconds as we don't know exactly the number of frames of the extracted talk
  - `[1:a] afade=t=in:ss=0:d=1, afade=t=out:st=${fadeOutStartTime}:d=1 [faded-talk-audio];` just does the same fade in and fade out effects for the audio. We only do that for the talk as the intro doesn't have audio at the beginning nor at the ending and the outro has no audio at all
  - we do the same thing for the outro we did for the intro, a fade in and a fade out effect as we know exactly the number of frames (duration x framerate = 7 x 25 = 175).
  - `[faded-intro] [0:a] [faded-talk-video] [faded-talk-audio] [faded-outro] [3:a]` we select all the streams to process, the faded intro, its audio stream (`[0:a]`), the faded talk and its faded audio stream and finally the faded outro and its audio stream (`[3:a]` and not `[2:a]` as we generated a fourth audio input)
  - `concat=n=3:v=1:a=1 [v] [a]` uses the concat filter, specifying the number of streams to concatenate and naming the resulting video and audio streams (respectively `v` and `a`)
  - `-map "[v]" -map "[a]" ${output}` at last allows to map the previously resulting streams `v` and `a` to the output file
  - `-c:v libx264 -crf 17` selects the libx264 encoder for the video, using a constant rate factor of 17 to encode the video, considered as almost lossless (see https://trac.ffmpeg.org/wiki/Encode/H.264 for more information)
  - `-c:a aac -b:a 192k` selects the aac encoder for the audio, using a bitrate of 192 kbit/s

## Contribute

PRs accepted.

## License

See [LICENSE](./LICENSE)
