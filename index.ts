import express, { response } from "express";
import dotenv from "dotenv";
import axios from "axios";
import cookieParser from "cookie-parser";
import cors from "cors";
import qs from "qs";
dotenv.config();

const app = express();
app.use(cors({ credentials: true}));
app.use(cookieParser());


const CLIENT_ID = process.env.CLIENT_ID as string;
const CLIENT_SECRET = process.env.CLIENT_SECRET as string;

const REDIRECT_URL = process.env.REDIRECT_URL as string;
const stateKey = "spotify_auth_state";

const generateRandomString = (length: number) => {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Login
app.get("/login", function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  const scopeList = [
    // image
    "ugc-image-upload",
    // spotify connect
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    // playback
    "app-remote-control",
    "streaming",
    // playlist
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-private",
    "playlist-modify-public",
    // follow
    "user-follow-modify",
    "user-follow-read",
    // listening history
    "user-read-playback-position",
    "user-top-read",
    "user-read-recently-played",
    // library
    "user-library-modify",
    "user-library-read",
    // users
    "user-read-email",
    "user-read-private",
  ]

  const scope = scopeList.join(' ')

  const info = {
    response_type: "code",
    client_id: CLIENT_ID,
    scope: scope,
    redirect_uri: REDIRECT_URL,
    state: state,
  };

  res.redirect("https://accounts.spotify.com/authorize?" + qs.stringify(info));
});


// Get Access Token
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  // Error occurred OR access denied
  if (state === null || state !== storedState) {
    return res.redirect("/#" + "error=state_mismatch");
  }
  try {
    res.clearCookie(stateKey);
    const data = qs.stringify({
      code: code,
      redirect_uri: REDIRECT_URL,
      grant_type: "authorization_code",
    });
    const response = await axios.post("https://accounts.spotify.com/api/token", data, {
      headers: {
        Authorization: "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
      },
    });
    res.send(response.data);
  } catch (error) {
    res.send({status: "FAILED"});
  }
});

// Retrieve Refresh token and get New Access token
// requesting access token from refresh token
app.get("/refresh_token", async (req, res) => {
  const refresh_token = req.query.refresh_token;

  try {
    const data = qs.stringify({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    });

    const response = await axios.post("https://accounts.spotify.com/api/token", data, {
      headers: { Authorization: "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64") },
    });
    res.send(response.data);
  } 
  catch (error) {
    console.log(error);
    res.send("Failed");
  }
});


app.listen(8000, () => {
  console.log("Listening at port 8000");
});
