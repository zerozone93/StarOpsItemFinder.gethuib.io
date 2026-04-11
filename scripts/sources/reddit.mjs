import { getJson, sleep } from "../lib/http.mjs";

const SUBREDDITS = ["starcitizen", "starcitizen_trades", "starcitizen_guilds"];

async function getRedditAccessToken() {
  const body = new URLSearchParams({
    grant_type: "password",
    username: process.env.REDDIT_USERNAME || "",
    password: process.env.REDDIT_PASSWORD || ""
  });

  const auth = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "authorization": `Basic ${auth}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": process.env.REDDIT_USER_AGENT || "StarOpsItemFinderBot/1.0"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Reddit auth failed: ${response.status}`);
  }

  return response.json();
}

function extractMentions(posts) {
  const mentions = [];

  for (const post of posts) {
    const text = `${post.data.title}\n${post.data.selftext || ""}`;
    const lower = text.toLowerCase();

    const candidates = [
      "hadanite",
      "janalite",
      "quantanium",
      "lyria",
      "aberdeen",
      "daymar",
      "magda",
      "ita",
      "roc",
      "prospector",
      "mole"
    ];

    for (const term of candidates) {
      if (lower.includes(term)) {
        mentions.push({
          name: term,
          postTitle: post.data.title,
          permalink: `https://reddit.com${post.data.permalink}`,
          upvotes: post.data.ups,
          createdUtc: post.data.created_utc
        });
      }
    }
  }

  return mentions;
}

export async function fetchRedditData() {
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
    return {
      meta: { sourceName: "Reddit", skipped: true, reason: "Missing credentials" },
      systems: [],
      locations: [],
      resources: [],
      miningMethods: [],
      tools: [],
      vehicles: [],
      vendors: [],
      lootSources: [],
      blueprints: [],
      recipes: [],
      weapons: [],
      armor: []
    };
  }

  const token = await getRedditAccessToken();
  const headers = {
    "authorization": `Bearer ${token.access_token}`,
    "user-agent": process.env.REDDIT_USER_AGENT || "StarOpsItemFinderBot/1.0"
  };

  const mentions = [];

  for (const subreddit of SUBREDDITS) {
    const listing = await getJson(
      `https://oauth.reddit.com/r/${subreddit}/search?q=mining%20OR%20hadanite%20OR%20quantanium&restrict_sr=1&sort=new&limit=25`,
      { headers }
    );

    mentions.push(...extractMentions(listing?.data?.children || []));
    await sleep(1200);
  }

  return {
    meta: {
      sourceName: "Reddit"
    },
    systems: [],
    locations: [],
    resources: [],
    miningMethods: [],
    tools: [],
    vehicles: [],
    vendors: [],
    lootSources: mentions.map((m, i) => ({
      name: `reddit-mention-${i + 1}`,
      slug: `reddit-mention-${i + 1}`,
      description: `${m.name} mentioned in Reddit discussion`,
      verificationStatus: "partial",
      confidenceScore: 0.35,
      sourceReferences: [
        {
          source: "reddit",
          url: m.permalink,
          title: m.postTitle
        }
      ]
    })),
    blueprints: [],
    recipes: [],
    weapons: [],
    armor: []
  };
}