# GATI Weekly Intelligence Bulletin
Automated Germany healthcare labour market bulletin — runs every Monday at 08:00 CET via GitHub Actions. No server. No local machine needed.

---

## How it works

```
GitHub Actions cron (Mon 08:00 CET)
  → Search Serper API across 7 queries (last 7 days, Germany-biased)
  → Deduplicate articles → send top 15 to Claude API
  → Claude formats bulletin using your system prompt
  → Post to Slack channel via incoming webhook
```

---

## One-time setup (15 minutes)

### 1. Create a GitHub repo
- Go to github.com → New repository
- Name it `gati-bulletin` (or anything you like)
- Push these files to it

### 2. Get your API keys

**Serper API (news search)**
- Go to serper.dev → Sign up → free tier gives 2,500 searches
- Copy your API key from the dashboard

**Slack Incoming Webhook**
- Go to your Slack workspace → Apps → Incoming Webhooks → Add New Webhook
- Choose the channel to post to
- Copy the Webhook URL (starts with `https://hooks.slack.com/...`)

**Anthropic API key**
- Go to console.anthropic.com → API Keys
- Create a new key or copy an existing one

### 3. Add secrets to GitHub
Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

Add these four secrets:

| Secret name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SERPER_API_KEY` | Your Serper API key |
| `SLACK_WEBHOOK_URL` | Your Slack incoming webhook URL |
| `BULLETIN_SYSTEM_PROMPT` | Your bulletin prompt (add when ready) |

### 4. Test it manually
- Go to your repo → **Actions** tab
- Click **GATI Weekly Bulletin** → **Run workflow** → **Run workflow**
- Watch the logs in real time

---

## Schedule
Runs every **Monday at 07:00 UTC (08:00 CET / 12:30 IST)**.

To change the schedule, edit the cron line in `.github/workflows/bulletin.yml`:
```yaml
- cron: "0 7 * * 1"   # Min Hour DayOfMonth Month DayOfWeek
```
Cron helper: crontab.guru

---

## Customising search queries
Edit the `SEARCH_QUERIES` array in `src/bulletin.js` to add or remove topics.

---

## Costs
| Service | Cost |
|---|---|
| GitHub Actions | Free (2,000 min/month; this job uses ~2 min/week) |
| Serper API | Free tier: 2,500 searches. This job uses 7/week (~364/year) |
| Anthropic API | ~$0.01–0.03 per bulletin run (Claude Sonnet) |
| Slack | Free |

---

## Troubleshooting

**Bulletin not posting?**
Check the Actions tab → click the failed run → read the logs. Common causes:
- Missing or wrong secret name
- `BULLETIN_SYSTEM_PROMPT` not yet set

**Want to change frequency to daily?**
```yaml
- cron: "0 7 * * 1-5"  # Weekdays at 08:00 CET
```

**Want to add more Slack channels?**
Create multiple incoming webhooks and add them as separate secrets (`SLACK_WEBHOOK_URL_2` etc.), then duplicate the `postToSlack` call in `bulletin.js`.
