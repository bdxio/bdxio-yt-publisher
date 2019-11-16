const fs = require("fs");
const http = require("http");
const querystring = require("querystring");
const url = require("url");
const util = require("util");
const { execSync } = require("child_process");
const config = require("config");
const parse = util.promisify(require("csv-parse"));
const moment = require("moment");
const { google } = require("googleapis");
const youtube = google.youtube("v3");
const destroyer = require("server-destroy");
const open = require("open");
const _ = require("lodash");
const fetch = require("node-fetch");
const prettyBytes = require("pretty-bytes");

const { escapeHtml, capitalize } = require("./strings");

/**
 * The downloaded streams and splitted videos to upload are stored in the videos folder.
 */
const VIDEOS_PATH = `${__dirname}/videos`;

/**
 * Expression used to format a moment time into a compatible ffmpeg time duration.
 */
const FFMPEG_TIME_FORMAT = "H:mm:ss";

/**
 * Default template to apply to uploaded talks.
 */
const DEFAULT_TITLE_TEMPLATE = "BDX I/O ${year} - ${title} - ${speakers}";

/**
 * The maximum number of characters allowed in uploaded video title.
 * YouTube allows 100 characters and the title template should contain the variable "${title}" which has
 * 8 characters.
 */
const TITLE_NB_CHARACTERS_MAX = 108;

/**
 * Authorization scopes for YouTube :
 * - youtube is used to manage account and playlist
 * - youtube.upload is used to upload videos to accounts
 */
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.upload"
];

/**
 * Default parameters configuration for YouTube.
 */
const YOUTUBE_DEFAULT_CONFIG = {
  categoryId: "28", // 28 is the identifier for "Science & Technology" category
  license: "youtube", // youtube is the standard YouTube license
  privacyStatus: "private" // uploaded talks are private by default in case something goes wrong
};

/**
 * Read the configuration parameters from file or set default values when possible.
 */

// By defaut the current year is used.
const conferenceYear = config.has("year")
  ? config.get("year")
  : new Date().getFullYear();

// Path to the CSV file containing the list of the talks.
const csvPath =
  __dirname + config.has("csv")
    ? `${__dirname}/${config.get("csv")}`
    : `Talks ${conferenceYear} - Vidéos.csv`;

// Whether we should download or not the streams.
const download = config.has("download") ? config.get("download") : false;

// The extension to use for the downloaded streams.
const downloadExt = config.has("downloadExt")
  ? config.get("downloadExt")
  : "mp4";

// Turns on or off extraction of talks from the downloaded streams.
const extract = config.has("extract") ? config.get("extract") : false;

const intro = config.has("intro")
  ? `${__dirname}/${config.get("intro")}`
  : undefined;
const outro = config.has("outro")
  ? `${__dirname}/${config.get("outro")}`
  : undefined;

// Title template to apply to uploaded videos.
const titleTemplate = config.has("title")
  ? config.get("title")
  : DEFAULT_TITLE_TEMPLATE;

// Allows to upload or not the extracted talks to YouTube.
const upload = config.has("upload") ? config.get("upload") : false;

// If no rooms to process are defined all rooms are processed.
const roomsToProcess = config.has("rooms") ? config.get("rooms") : undefined;

// The CFP is used to retrieve additional information for talks (title, speakers and description).
const cfpUrl = config.get("cfpUrl");
const cfpEventId = config.get("cfpEventId");
const cfpApiKey = config.get("cfpApiKey");

/**
 * Various configuration parameters for YouTube.
 * Destructuring the default configuration parameters and then the parameters from the configuration file ensures that missing parameters are correctly set.
 */
const youtubeConfig = config.has("youtube")
  ? { ...YOUTUBE_DEFAULT_CONFIG, ...config.get("youtube") }
  : YOUTUBE_DEFAULT_CONFIG;

// Arguments passed to youtube-dl.
const youtubeDlArgs = fs.readFileSync("youtube-dl.args", "UTF-8");

// Arguments passed to ffmpeg.
const ffmpegArgsTemplate = fs.readFileSync("ffmpeg.args", "UTF-8");

if (!download && !extract && !upload) {
  console.error(
    "🤔 it looks like you don't want to do anything, are you sure?"
  );
  return;
}

// If upload is enabled data from the CFP will be loaded once in this variable.
let cfpData;

/**
 * The main function, invoked when running the script.
 */
const main = async () => {
  try {
    const file = fs.readFileSync(csvPath);
    const data = await parse(file);
    const talks = data.map(parseCsvTalk).filter(isTalkValid);

    mkdir(VIDEOS_PATH);

    if (upload) {
      const auth = await authenticate();
      google.options({ auth });
    }

    const talksByRoom = _.groupBy(talks, talk => talk.room);
    const roomNames = _.uniq(talks.map(talk => talk.room));

    for (const roomName of roomNames) {
      const roomTalks = talksByRoom[roomName];
      const splittedVideos = splitRoom(roomTalks, roomName);
      if (upload) {
        cfpData = await downloadCfpData();
        for (const video of splittedVideos) {
          await uploadTalk(video);
        }
      }
    }
  } catch (err) {
    throw err;
  }
};

/**
 * Run the main function 🤞
 */
main()
  .then(() => {
    console.log("All done 🎉");
  })
  .catch(err => {
    console.error(err);
  });

/**
 * Map a talk from a CSV line to an object.
 * The expected fields are :
 *   - room (column 3/D)
 *   - id (column 6/G)
 *   - title (column 0/A)
 *   - start offset (column 4/E)
 *   - end offset (column 5/F)
 *   - stream url (column 7/H)
 *   - speakers (column 1/B)
 * @param {Array} talk a CVS line, splitted into an array, containing all CSV fields for a talk
 */
const parseCsvTalk = talk => ({
  room: talk[3],
  id: talk[6],
  title: talk[0],
  start: parseTime(talk[4]),
  end: parseTime(talk[5]),
  streamUrl: parseStreamUrl(talk[7]),
  speakers: talk[1]
});

/**
 * Parse an offset time (in format HHhMMmSSs).
 * @param {String} time The time to parse.
 */
const parseTime = time => moment(time, "h[h]mm[m]ss[s]");

/**
 * Parse an URL for a stream, removing trailing parameters for the URL.
 * @param {String} url The URL to parse.
 */
const parseStreamUrl = url => url.replace(/&t=[0-9]h[0-9]{2}m[0-9]{2}s/, "");

/**
 * Filter out invalid talks.
 * @param {Object} talk a talk object
 */
const isTalkValid = talk => {
  // Check if the talk has all the required fields.
  if (!talk.room || talk.room === "") return false;
  if (!talk.id || talk.id === "") return false;
  if (!talk.title || talk.title === "") return false;
  if (!talk.start || talk.start === "" || talk.start === "???") return false;
  if (!talk.end || talk.end === "" || talk.end === "???") return false;
  if (!talk.streamUrl || talk.url === "") return false;

  // Exclude talks if the configuration don't include its room.
  if (config.has("rooms") && !config.get("rooms").includes(talk.room)) {
    return false;
  }

  return true;
};

/**
 * Authenticate through Google account to authorize YouTube operations.
 */
const authenticate = async () => {
  const oauth2 = new google.auth.OAuth2(
    config.get("credentials").client_id,
    config.get("credentials").client_secret,
    config.get("credentials").redirect_uri
  );

  return new Promise((resolve, reject) => {
    const authorizeUrl = oauth2.generateAuthUrl({
      access_type: "offline",
      scope: YOUTUBE_SCOPES
    });
    console.log(
      `Open the following link in your browser to allow access to your YouTube account:\n${authorizeUrl}`
    );
    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url.indexOf("/oauth2callback") > -1) {
            const qs = querystring.parse(url.parse(req.url).query);
            res.end("Got the token 🔓");
            server.destroy();
            const { tokens } = await oauth2.getToken(qs.code);
            oauth2.setCredentials(tokens);
            resolve(oauth2);
          }
        } catch (e) {
          reject(e);
        }
      })
      .listen(5000, () => {
        open(authorizeUrl, { wait: false }).then(cp => cp.unref());
      });
    destroyer(server);
  });
};

/**
 * Create a directory if it doesn't exist.
 * @param {String} path The path to create.
 */
const mkdir = path => fs.existsSync(path) || fs.mkdirSync(path);

/**
 * Split a stream into a list of talks for a given room.
 * @param {Array} talks The list of talks to extract from the stream.
 * @param {String} roomName The room name.
 */
const splitRoom = (talks, roomName) => {
  // We sort the talks in time order to be sure (trust no one).
  const sortedTalks = _.sortBy(talks, ["start"]);
  const url = sortedTalks[0].streamUrl;
  const directory = `${VIDEOS_PATH}/${roomName}`;
  mkdir(directory);
  const video = downloadStream(roomName, url, directory);

  return sortedTalks.map(talk => extractTalk(video, talk, directory));
};

/**
 * Download a stream for a room (using youtube-dl).
 * @param {String} roomName The room name.
 * @param {String} url The URL of the stream for the room.
 */
const downloadStream = (roomName, url, directory) => {
  const video = `${directory}/${roomName}.${downloadExt}`;
  if (download) {
    console.log(`Downloading ${url} to ${video}...`);
    /**
     * If using MKV format youtube-dl has to download two streams and merge them after.
     * We need to let youtube-dl figure out the file extension (using ext template) and praise that
     * the user set the download extension accordingly to his youtube-dl arguments.
     */
    execSync(
      `youtube-dl --output "${directory}/${roomName}.%(ext)s" ${youtubeDlArgs} ${url}`
    );
  }

  return video;
};

/**
 * Extract a talk from a stream, optionnally adding an intro and an outro.
 *
 * @param {String} stream The path to the stream containing the talk to extract (used by ffmpegArgsTemplate).
 * @param {Object} talk The talk to extract.
 * @param {String} directory The directory where to put the extracted video.
 */
const extractTalk = (stream, talk, directory) => {
  const start = talk.start.format(FFMPEG_TIME_FORMAT);
  const end = talk.end.format(FFMPEG_TIME_FORMAT);
  const talkDuration = talk.end.diff(talk.start, "seconds");
  // fadeOutStartTime is used when evaluating ffmpegArgsTemplate below.
  const fadeOutStartTime = talkDuration - 1;
  const output = `${directory}/${talk.id}.mp4`;

  if (extract) {
    // Using a template engine instead of eval would surely be much safer!
    const ffmpegArgs = eval("`" + ffmpegArgsTemplate + "`");
    console.log(`Extracting ${talk.title} from ${start} to ${end}`);
    execSync(`ffmpeg ${ffmpegArgs}`);
  }

  return { output, ...talk };
};

const downloadCfpData = async () => {
  console.log(`Downloading CFP data...`);
  const response = await fetch(`${cfpUrl}/${cfpEventId}?key=${cfpApiKey}`);

  if (response.status !== 200) {
    throw Error(
      `unable to retrieve talk information on CFP: ${response.status} - ${response.statusText}`
    );
  }

  return await response.json();
};

/**
 * Upload a given talk to YouTube.
 * @param {Object} talk The talk to upload.
 */
const uploadTalk = async talk => {
  const talkWithInfos = await fetchTalkInfos(talk);
  const metadata = generateMetadata(talkWithInfos);
  const video = await uploadToYouTube(talk, metadata);
  return video;
};

/**
 * Upload a video to YouTube.
 * @param {Object} metadata The YouTube metadata to upload.
 */
const uploadToYouTube = async (talk, metadata) => {
  const fileSize = fs.statSync(talk.output).size;
  const result = await youtube.videos.insert(metadata, {
    onUploadProgress: evt => {
      const progress = (evt.bytesRead / fileSize) * 100;
      const completion = Math.round(progress);
      console.log(
        `${prettyBytes(
          evt.bytesRead
        )} bytes uploaded (${completion}% complete).`
      );
    }
  });
  return result.data;
};

/**
 * Fetch additional informations for a given talk.
 * @param {Object} talk The talk.
 */
const fetchTalkInfos = async talk => {
  console.log(`Fetching infos for talk ${talk.id}...`);
  const cfpTalk = cfpData.talks.find(t => t.id === talk.id);
  // Some talks don't have data on the CFP (keynotes for example)
  if (cfpTalk === undefined) {
    return { ...talk, description: talk.title };
  }

  const { title, abstract: description } = cfpTalk;
  const speakers = cfpTalk.speakers
    .map(findSpeaker)
    .map(speaker => speaker.displayName)
    .map(capitalize)
    .join(" et ");

  return { ...talk, title, speakers, description };
};

const findSpeaker = uid => {
  const speaker = cfpData.speakers.find(s => s.uid === uid);
  if (speaker === undefined) throw Error(`speaker with uid ${uid} not found`);

  return speaker;
};

/**
 * Generate metadata for a talk to upload.
 * @param {Object} talk The talk to use to generate metadata
 */
const generateMetadata = talk => {
  let title = titleTemplate
    .replace("${year}", conferenceYear)
    .replace("${speakers}", talk.speakers);

  if (title.length + talk.title.length <= TITLE_NB_CHARACTERS_MAX) {
    title = title.replace("${title}", escapeHtml(talk.title));
  } else {
    const remainingCharacters = TITLE_NB_CHARACTERS_MAX - title.length;
    title = title.replace(
      "${title}",
      talk.title.slice(0, remainingCharacters - 1) + "…"
    );
  }

  const { description } = talk;

  return {
    resource: {
      snippet: {
        title,
        description,
        categoryId: youtubeConfig.categoryId
      },
      status: {
        license: youtubeConfig.license,
        privacyStatus: youtubeConfig.privacyStatus
      }
    },
    part: "snippet, status",
    media: { body: fs.createReadStream(`${talk.output}`) },
    notifySubscribers: false
  };
};
