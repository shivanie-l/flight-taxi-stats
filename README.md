# TarmacTracker

How long do airlines keep you trapped on the tarmac? This site tracks **doors-close to wheels-up** time (taxi-out) for US commercial flights using public DOT/BTS data.

## Quick start

### 1. Install prerequisites

```bash
# Install Node.js (https://nodejs.org or via nvm)
brew install node  # or: nvm install 20

# Install Python deps
pip3 install -r data-pipeline/requirements.txt
```

### 2. Download and process flight data

```bash
# Downloads ~2 years of BTS on-time performance data (~2 GB unzipped, cached as parquet)
python3 data-pipeline/download_bts.py --years 2023 2024 --output data-pipeline/raw

# Aggregate into public/data/summary.json
python3 data-pipeline/process_data.py
```

### 3. Run the site locally

```bash
npm install
npm run dev
# → http://localhost:5173
```

### 4. Build for production

```bash
npm run build
# Output in dist/
```

## Deploying to Cloudflare Pages

1. Push this repo to GitHub
2. Create a Cloudflare Pages project pointing to your repo
3. Set build command: `npm run build`, output dir: `dist`
4. Add GitHub Actions secrets:
   - `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with Pages edit permissions
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
5. The `.github/workflows/update-data.yml` workflow will auto-run on the 15th of each month

## Data source

[BTS On-Time Reporting Carrier On-Time Performance](https://www.transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FGJ)

Key fields used:
- `DEP_TIME` — actual gate departure (doors close / pushback)
- `WHEELS_OFF` — actual takeoff time
- `TAXI_OUT` = `WHEELS_OFF - DEP_TIME` — the metric we care about
- `DEP_DEL15` — the on-time flag airlines are officially rated on (gate-only)

## The "on-time trap" metric

We define **on-time trap rate** as the percentage of flights marked on-time at the gate (`DEP_DEL15 = 0`) that still had a taxi-out time exceeding 15 minutes. These are flights where the official metric looks fine but passengers sat on the tarmac for a significant period after pushback.
