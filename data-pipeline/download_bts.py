"""
Download BTS On-Time Performance data for a given year/month range.

BTS makes data available ~2 months after the reference month.
Each month's CSV is ~50-80 MB unzipped, ~10 MB zipped.

Usage:
  python download_bts.py --years 2022 2023 2024 --output raw/
"""
import argparse
import os
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
    resp = requests.get(url, stream=True, timeout=120)
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--years", nargs="+", type=int, default=[2023, 2024])
    parser.add_argument("--output", default="data-pipeline/raw")
    args = parser.parse_args()

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    today = date.today()
    for year in args.years:
        for month in range(1, 13):
            # Don't try to fetch future months or months not yet released (~2mo lag)
            ref = date(year, month, 1)
            release_lag_months = 2
            release_approx = date(
                ref.year + (ref.month + release_lag_months - 1) // 12,
                (ref.month + release_lag_months - 1) % 12 + 1,
                15,
            )
            if release_approx > today:
                print(f"  {year}-{month:02d}: not yet released, stopping")
                return
            download_month(year, month, out_dir)


if __name__ == "__main__":
    main()
