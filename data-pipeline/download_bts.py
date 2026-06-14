"""
Download BTS On-Time Performance data for a given year/month range.

BTS makes data available ~2 months after the reference month.
Each month's CSV is ~50-80 MB unzipped, ~10 MB zipped.

Usage:
  python download_bts.py --start 2024-04 --output raw/
  python download_bts.py --years 2022 2023 2024 --output raw/
"""
from __future__ import annotations

import argparse
import zipfile
import io
from pathlib import Path
from datetime import date

import requests
from tqdm import tqdm

BTS_URL = (
    "https://transtats.bts.gov/PREZIP/"
    "On_Time_Reporting_Carrier_On_Time_Performance_1987_present_{year}_{month}.zip"
)

# BTS blocks the default python-requests User-Agent; present as a browser.
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
}

FIELDS = [
    "Year", "Month", "DayofMonth", "Reporting_Airline",
    "Origin", "Dest",
    "CRSDepTime", "DepTime", "DepDelay", "DepDel15",
    "WheelsOff", "TaxiOut",
    "Cancelled", "Diverted",
]


def download_month(year: int, month: int, out_dir: Path) -> Path | None:
    out_path = out_dir / f"ontime_{year}_{month:02d}.parquet"
    if out_path.exists():
        print(f"  {year}-{month:02d}: already downloaded, skipping")
        return out_path

    url = BTS_URL.format(year=year, month=month)
    print(f"  {year}-{month:02d}: downloading from {url}")
    resp = requests.get(url, stream=True, timeout=300, headers=HEADERS)
    if resp.status_code == 404:
        print(f"  {year}-{month:02d}: not yet available (404)")
        return None
    resp.raise_for_status()

    total = int(resp.headers.get("content-length", 0))
    buf = io.BytesIO()
    with tqdm(total=total, unit="B", unit_scale=True, leave=False) as bar:
        for chunk in resp.iter_content(chunk_size=65536):
            buf.write(chunk)
            bar.update(len(chunk))

    buf.seek(0)
    with zipfile.ZipFile(buf) as z:
        csv_name = next(n for n in z.namelist() if n.endswith(".csv"))
        import pandas as pd
        df = pd.read_csv(z.open(csv_name), usecols=lambda c: c in FIELDS, low_memory=False)

    # Keep only non-cancelled, non-diverted flights with valid taxi data
    df = df[
        (df["Cancelled"] == 0) &
        (df["Diverted"] == 0) &
        (df["TaxiOut"].notna()) &
        (df["TaxiOut"] > 0) &
        (df["TaxiOut"] < 300)  # >5h taxi-out is almost certainly bad data
    ].copy()

    df.to_parquet(out_path, index=False)
    print(f"  {year}-{month:02d}: saved {len(df):,} rows → {out_path.name}")
    return out_path


def month_range(start: date, end: date):
    """Yield (year, month) from start through end inclusive."""
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        yield y, m
        m += 1
        if m > 12:
            m, y = 1, y + 1


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", help="earliest month to fetch, YYYY-MM")
    parser.add_argument("--years", nargs="+", type=int,
                        help="(legacy) fetch all months of these years")
    parser.add_argument("--output", default="data-pipeline/raw")
    args = parser.parse_args()

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    today = date.today()
    if args.start:
        sy, sm = map(int, args.start.split("-"))
        start = date(sy, sm, 1)
    elif args.years:
        start = date(min(args.years), 1, 1)
    else:
        # default: last 24 months
        start = date(today.year - 2, today.month, 1)

    # Attempt every month from start through the current calendar month. Months
    # BTS hasn't released yet return 404 and are skipped (not fatal) — we don't
    # rely on a guessed release-lag date, since that can wrongly skip the most
    # recent available month.
    fetched = 0
    for year, month in month_range(start, today):
        path = download_month(year, month, out_dir)
        if path is not None:
            fetched += 1
    print(f"\nDone. {fetched} months available in {out_dir}/")


if __name__ == "__main__":
    main()
