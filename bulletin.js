// GATI Weekly Intelligence Bulletin
// Searches for Germany healthcare labour market news → Claude summary → Slack post

const SEARCH_QUERIES = [
  "Germany healthcare workforce shortage 2026",
  "Germany nursing shortage international recruitment",
  "Pflegemangel Deutschland Fachkräfte",
  "Bundesagentur Arbeit Engpassberufe Pflege",
  "Triple Win programme nurses Germany",
  "Germany Krankenpflege Pflegepersonal",
  "StepStone healthcare jobs Germany demand"
];

// ─── Search ────────────────────────────────────────────────────────────────────

async function searchNews(query) {
  const res = await fetch("https://google.serper.dev/news", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: 5,
      gl: "de",      // Germany-biased results
      hl: "en",      // English results preferred
      tbs: "qdr:w",  // Last 7 days only
    }),
  });

  if (!res.ok) throw new Error(`Serper error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.news || [];
}

// ─── Claude ────────────────────────────────────────────────────────────────────

async function generateBulletin(articles) {
  const articleText = articles
    .map(
      (a, i) =>
        `${i + 1}. ${a.title}\n   Source: ${a.source} | ${a.date}\n   ${a.snippet}\n   URL: ${a.link}`
    )
    .join("\n\n");

  const systemPrompt = process.env.BULLETIN_SYSTEM_PROMPT;
  if (!systemPrompt) {
    throw new Error(
      "BULLETIN_SYSTEM_PROMPT secret is not set. Add it in GitHub → Settings → Secrets."
    );
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Here are this week's articles. Today's date: ${new Date().toDateString()}\n\n${articleText}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text;
}

// ─── Slack ─────────────────────────────────────────────────────────────────────

async function postToSlack(bulletin, articleCount) {
  const payload = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🇩🇪 GATI Weekly Intelligence Bulletin",
          emoji: true,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*${new Date().toDateString()}*  ·  ${articleCount} sources scanned across ${SEARCH_QUERIES.length} queries`,
          },
        ],
      },
      { type: "divider" },
      {
        type: "section",
        text: { type: "mrkdwn", text: bulletin },
      },
      { type: "divider" },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "_Automated via GitHub Actions · GATI Intelligence Pipeline_",
          },
        ],
      },
    ],
  };

  const res = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Slack error ${res.status}: ${await res.text()}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 Searching for articles...");

  const allArticles = [];
  for (const query of SEARCH_QUERIES) {
    try {
      const articles = await searchNews(query);
      allArticles.push(...articles);
      console.log(`   "${query}" → ${articles.length} results`);
    } catch (err) {
      console.warn(`   ⚠️  Skipping "${query}": ${err.message}`);
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = allArticles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  console.log(`\n📰 ${unique.length} unique articles collected`);

  if (unique.length === 0) {
    console.log("No articles found this week. Exiting without posting.");
    return;
  }

  console.log("🤖 Generating bulletin with Claude...");
  const bulletin = await generateBulletin(unique.slice(0, 15)); // Cap at 15 to stay within token limits

  console.log("📤 Posting to Slack...");
  await postToSlack(bulletin, unique.length);

  console.log("✅ Bulletin posted successfully");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
