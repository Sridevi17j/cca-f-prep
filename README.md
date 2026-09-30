# CCA-F Practice · PiHive

Practice desk for [PiHive Technologies](https://pihivetech.com) cohort participants drilling CCA-F questions. Pick a bank, choose an answer, and read the explanation on the same screen. There is no login and no backend. Progress stays in the browser.

## Question banks

- **Latest** (default) — 134 questions with five topics. This is the bank for current prep.
- **Older dump** (GitHub cca-prep) — 350 questions, six practice exams, from [devgotomarket/cca-prep](https://github.com/devgotomarket/cca-prep). It is labeled Older dump everywhere so it is not confused with Latest.

The older source file merges some correct choices into the previous option and sometimes repeats the answer at the end of the stem. `src/lib/normalize.ts` repairs that at load time. The JSON in `src/data/` is the original upload.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

```bash
npm run check   # 134 + 350 questions, four choices each, no spoiled stems
npm run lint
npm run build
```

Node.js 20 or newer.

## Deploy on Vercel

Import this repository on Vercel Hobby. Framework preset: **Next.js**. No environment variables. Production branch: `main`.

`next build` prerenders the pages. The exam itself runs in the browser and reads the question banks from the client bundle. No `vercel.json` is required.
