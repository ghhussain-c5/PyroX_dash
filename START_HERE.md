# PyroX — deploy the dashboard and activate Groq

The new dashboard keeps your team's navy, blue, cyan and violet palette, original logo and embedded research data. It uses four pages: Research, Compare, Sources and Ask a question.

**Download the ZIP, extract it, and open `index.html` to try the dashboard immediately.** Research ranking, graphs, source search and exports work without AI. To generate answers, complete the three deployment stages below.

## 1. Put the files on GitHub

For the simplest setup, make a **new repository** named `pyrox-dashboard`. This avoids the old React/Vite workflow in your existing repository.

1. Sign in to [GitHub](https://github.com/).
2. Click **+ → New repository**. Name it `pyrox-dashboard`. Choose **Public**, then **Create repository**. Choose a private repo only if your GitHub plan supports Pages for private repositories.
3. Click **uploading an existing file** (or **Add file → Upload files**).
4. Open the extracted ZIP folder on your computer. Drag its **contents** into GitHub. Do not upload the ZIP itself or wrap everything inside an extra folder.
5. The repository's first level must contain `index.html`, `config.js`, `data.json`, `package.json`, and the `backend` folder. Upload the other included files and folders too.
6. Click **Commit changes**. The branch should be `main`.
7. Open **Settings → Pages**.
8. Under **Build and deployment → Source**, choose **Deploy from a branch**.
9. Choose branch **main** and folder **/(root)**. Click **Save**.
10. Wait for the Pages deployment to finish. The link appears in **Settings → Pages**. It normally has this form: `https://YOUR-USERNAME.github.io/pyrox-dashboard/`.

**No `.github` folder, custom Actions workflow, React build or npm installation is needed for the website.** If a hidden `.env.example` or `.gitignore` does not upload, that does not prevent this deployment. Never upload a real `.env` with secrets.

If using your existing PyroX repository instead: keep a copy of the old files, disable the old custom “Deploy IGNIS” workflow under **Actions → workflow → … → Disable workflow**, upload these new files to the repository root, and switch **Settings → Pages** to **Deploy from a branch → main → /(root)**. Do not leave the old Vite deployment workflow publishing over this HTML.

## 2. Create a Groq key and deploy the backend

GitHub Pages serves HTML, CSS and JavaScript. The Groq key must live on a separate backend. This package includes that backend; it runs on Node.js with no third-party dependencies.

### Create the key

1. Open [Groq API keys](https://console.groq.com/keys) and sign in.
2. Create an API key for your project. Copy it into your password manager or directly into Render's secret field below.
3. Do **not** paste the key into `index.html`, `config.js`, GitHub, or the dashboard's team-code field.
4. Check your Groq project's model access and usage limits. The included default is `openai/gpt-oss-20b`, hosted by **Groq**. The name identifies the model; this app uses a Groq key and does not call the OpenAI API.

### Deploy on Render

1. Open [Render](https://dashboard.render.com/) and sign in.
2. Choose **New → Web Service**.
3. Connect your GitHub account and select the `pyrox-dashboard` repository.
4. Enter these settings:

| Render field | Value |
| --- | --- |
| Name | A unique name, such as `pyrox-research-api` |
| Branch | `main` |
| Language / Runtime | `Node` |
| Root Directory | Leave empty |
| Build Command | `npm install --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

5. Choose an instance plan available to your account. If you use a plan that sleeps when idle, the first request can take longer while it wakes up.
6. In **Environment Variables**, add:

| Key | What to enter |
| --- | --- |
| `GROQ_API_KEY` | Your real Groq API key. Keep it secret. |
| `GROQ_MODEL` | `openai/gpt-oss-20b` |
| `ALLOWED_ORIGINS` | Your GitHub Pages origin, e.g. `https://YOUR-USERNAME.github.io` — **no repository name and no trailing slash** |
| `APP_ACCESS_TOKEN` | A private team code of at least 16 characters. Generate a long random password. This is separate from the Groq key. |

7. Click **Create Web Service / Deploy**. Wait until Render shows **Live**.
8. Copy the Render service URL, for example `https://your-pyrox-api.onrender.com`.
9. Open that URL with `/health` at the end. You should see JSON containing `"ok": true` and `"configured": true`. If `configured` is false, check the environment variables above. This checks configuration; it does not yet prove the Groq key or team code is valid.

The backend accepts two concurrent requests and defaults to 30 requests per hour and 150 per day for the whole running service. These are in-memory demo limits and reset when the server restarts. Set Groq project usage/spend limits as well. A team code provides simple shared access, not separate user accounts. CORS alone is not authentication.

## 3. Connect the deployed website to the deployed backend

1. In GitHub, open **config.js** and click the pencil (**Edit this file**).
2. Change the empty URL to the Render URL:

```js
window.PYROX_CONFIG = {
  apiBaseUrl: "https://YOUR-ACTUAL-SERVICE.onrender.com"
};
```

3. Click **Commit changes**. Let GitHub Pages finish publishing.
4. Open your live GitHub Pages website. Refresh with **Ctrl + Shift + R** if necessary.
5. Click **Connect assistant** at the top.
6. The backend URL should already be filled. If not, paste your Render URL.
7. Enter the **team code** you set as `APP_ACCESS_TOKEN` on Render. This is **not** your Groq key.
8. Click **Check connection**.
9. Open **Ask a question** and try: **“What does BASS-II report about PMMA flame spread and oxygen concentration?”**
10. A successful answer is labeled **Generated with Groq** and shows clickable source passages. Open a citation to check its page.

Other team members can use the same website and team code. They do not need your Groq key. The browser keeps the team code only in memory, so they enter it again after a reload. The backend URL is not secret. Share the code only with people you want to use your Groq allowance.

## How the AI actually works

1. The browser sends the question, the applied scenario and optional source scope to your backend.
2. The backend searches the bundled report passages and workbook rows using a keyword retrieval index with document-frequency weighting.
3. It sends up to seven relevant passages, each labeled with a source and page/row location, to Groq.
4. Groq generates an answer, evidence gaps and next research steps.
5. The backend rejects answers with missing or invalid citation identifiers. The dashboard links valid identifiers to the original source extracts.

This is **retrieval-augmented generation (RAG)**. It does not train or fine-tune a model and does not run autonomous web research. Citation identifiers are checked; whether a claim is scientifically justified still requires reading the cited passage. Retrieved excerpts can miss relevant context. The frontend's relevance scores are transparent rules, independent of Groq.

The prompt explicitly separates measured results from requirements and planned ranges. It prohibits fabricated observations and safety certification. There is no simulated “AI answer” when the backend is disconnected.

## What was preserved

| Content | Included |
| --- | --- |
| Investigation catalog | All 20 original records |
| PDF text extracts | All 241 pages across 7 documents, including empty pages |
| Workbook extracts | Both workbooks; 25 sheets and 1,355 source rows including headings and notes |
| BASS-II Table 5.1 extraction | All 39 original rows |
| BASS-II Table 2.1 extraction | Both original rows, including separate experimental, computed and theoretical columns |
| Provenance and context | Original manifest, reference metadata, scenarios, research goals and watchlist |
| Logo and colors | Original embedded logo and navy/blue/cyan/violet palette |

The raw source objects are unchanged. The original manifest predates the workbook additions; it is preserved for provenance, not used as the current inventory. Catalog-only investigations are labeled. Dates or future-project statements in the original records are not live updates. The new dashboard does not independently verify the original PDFs or silently correct source transcription errors.

I removed the animated hero, glow-heavy panels, repeated workspaces, decorative intelligence claims and redundant controls. I retained the useful workflows in four tabs. Graphs plot available numeric values; missing values are not converted to zero. A pink reference marker represents your input, never a predicted measurement.

## Which files matter?

| File | Purpose |
| --- | --- |
| `index.html` | Self-contained dashboard, styling, logo and all embedded data. Opens by itself. |
| `config.js` | Public backend URL. This is the only frontend configuration to edit for deployment. |
| `data.json` | Same complete dataset for the backend and future updates. |
| `backend/server.mjs` | Private-key Groq API, retrieval, access-code check, request limits and CORS. |
| `backend/core.cjs` | Shared search, relevance and numeric-data helpers. |
| `package.json` | Tells Render how to start the server. |
| `tools/styles.css` | Editable stylesheet source. Rebuild the HTML after changing it. |
| `tools/app.js` and `tools/template.html` | Editable interface code. |
| `tools/build.py` | Rebuilds the self-contained HTML after a data/style/code edit. |
| `.env.example` | Blank configuration example for local development only. |
| `tests/research.test.mjs` | Automated data, retrieval, authentication, quota and Groq-contract checks. |

## Add more data later

For quick graph exploration, use **Compare → Add measurement rows**. CSV/JSON must use the supplied units and column names. Imported data remains only in that browser session and is not sent to the AI.

To permanently add a document to the website **and** AI, add a source object to `data.json` → `sources`. Match the existing format:

```json
{
  "id": "your_unique_source_id",
  "label": "Investigation · Report title",
  "kind": "Scientific report",
  "filename": "your_report.json",
  "source_filename": "original_report.pdf",
  "data": {
    "pages": [
      { "page": 1, "text": "Actual extracted page text..." }
    ]
  }
}
```

Use a unique ID. Preserve page numbers and provenance. To attach it to a research card, add/update the matching `REF` entry's `src`, `page` and `type`. To add a new investigation, copy the structure of an existing `STUDIES` record. Do not invent test ranges from a report's unrelated numbers.

Run `python tools/build.py` from the project folder, then upload/commit both `data.json` and the rebuilt `index.html`. Windows may use `py tools/build.py` instead. GitHub Pages updates the frontend; Render redeploys from the same repository and rebuilds its search index. **Uploading an unrelated JSON file alone does not add it to the app.**

## Change the design later

Edit `tools/styles.css`, then run `python tools/build.py` and commit the rebuilt `index.html` together with the stylesheet. For a quick manual edit, edit the `<style>` section inside `index.html` directly; a later rebuild will replace those manual changes with `tools/styles.css`.

## Local development (optional)

Use Node.js 22 and Python 3. No npm dependencies are required.

1. Copy `.env.example` to `.env` and fill your local secrets. Keep `.env` out of GitHub.
2. Set `ALLOWED_ORIGINS=http://localhost:8000`.
3. Run `npm start` in one terminal.
4. Run `python -m http.server 8000` in another terminal from this folder.
5. Open `http://localhost:8000` and connect the dashboard to `http://localhost:3000` with your team code.
6. Run `npm test` to run the included checks.

Opening `index.html` by double-click works for offline research. For AI, use the deployed website or the local HTTP server above; `file://` origins are deliberately not permitted by the backend.

## If something fails

| Symptom | Fix |
| --- | --- |
| GitHub Pages gives 404 | Confirm `index.html` is at the repository root and Pages uses `main` + `/(root)`. Check the Pages deployment result. |
| Old React deployment fails | Use the new repository or disable the old custom workflow. This version does not use Vite. |
| `/health` says `configured: false` | Add the real key, allowed origin and a team code of 16+ characters on Render; save/redeploy. |
| Browser says it cannot reach the backend | Check the exact Render URL and its Live status. `ALLOWED_ORIGINS` must match the website's origin without the repository path. |
| Team code rejected | Use `APP_ACCESS_TOKEN`, not `GROQ_API_KEY`. Codes are case-sensitive. |
| Groq rejects the server key | Replace `GROQ_API_KEY` in Render Environment. Do not edit frontend files. |
| Groq returns a model error | Check the project's allowed models; update `GROQ_MODEL` to an available chat model supporting JSON output. |
| Request/usage limit reached | Wait or adjust the backend limits responsibly; inspect Groq limits and billing. |
| Connection uses an old backend URL | Open Connection settings and replace it. A saved local URL takes precedence over `config.js`. |
| AI says no evidence was found | Use more specific investigation/material terms or add a source. The app does not invent a result. |

## Verification and limits

Automated checks cover data preservation, missing values, scenario ranking, source retrieval, authentication, CORS, request limits, invalid input and the Groq request/response contract using mocked provider responses. Browser checks cover the main user workflows. No live Groq request was made because your API key has not been provided or installed. You must complete the final live test in stage 3.

Official references checked when preparing this package:

- [GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Render Node service deployment](https://render.com/docs/deploy-node-express-app)
- [Groq API compatibility](https://console.groq.com/docs/openai)
- [Groq GPT-OSS 20B model](https://console.groq.com/docs/model/openai/gpt-oss-20b)
- [Groq JSON output](https://console.groq.com/docs/structured-outputs)
- [Groq usage/spend limits](https://console.groq.com/docs/spend-limits)
