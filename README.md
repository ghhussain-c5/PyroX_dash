# PyroX

A focused combustion research dashboard with the original PyroX branding and source data, plus a Groq research backend.

**Start with [START_HERE.md](START_HERE.md).** It has exact GitHub Pages, Groq and Render setup steps.

- Open `index.html` to use research, comparison graphs, document search and exports offline.
- Host the static site on GitHub Pages; deploy the included Node.js backend on Render.
- Keep `GROQ_API_KEY` and the private team access code only in backend environment variables.
- Enter the public backend URL in `config.js`.
- Run `npm test` for automated checks. Run `python tools/build.py` after changing the data or interface sources.

No frontend framework, third-party JavaScript libraries, build service or hidden GitHub workflow is required for the static website.
