"""
Aggregate raw parquet files into summary.json for the frontend.

Usage:
  python data-pipeline/process_data.py --input data-pipeline/raw --output public/data
"""
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

import pandas as pd
import numpy as np

# Shared taxi-out bin definition (must match the frontend's expectations).
# bin i covers [BIN_EDGES[i], BIN_EDGES[i+1]); final edge (999) is "120+".
BIN_EDGES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 120, 999]
NBINS = len(BIN_EDGES) - 1
TOD_LABELS = ["Early (12a-6a)", "Morning (6a-12p)", "Afternoon (12p-6p)", "Evening (6p-12a)"]
DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
TRAP_THRESHOLD = 15

AIRLINE_NAMES = {
    "AA": "American Airlines",
    "AS": "Alaska Airlines",
    "B6": "JetBlue",
    "DL": "Delta Air Lines",
    "F9": "Frontier Airlines",
    "G4": "Allegiant Air",
    "HA": "Hawaiian Airlines",
    "NK": "Spirit Airlines",
    "QX": "Horizon Air",
    "SY": "Sun Country Airlines",
    "UA": "United Airlines",
    "WN": "Southwest Airlines",
    "YX": "Republic Airways",
    "OO": "SkyWest Airlines",
    "MQ": "Envoy Air",
    "OH": "PSA Airlines",
    "YV": "Mesa Airlines",
    "PT": "Piedmont Airlines",
    "9E": "Endeavor Air",
    "G7": "GoJet Airlines",
    "ZW": "Air Wisconsin",
    "C5": "CommuteAir",
    "EM": "Empire Airlines",
    "9K": "Cape Air",
    "KS": "PenAir",
}

AIRPORT_NAMES: dict[str, tuple[str, str, str]] = {
    "ATL": ("Hartsfield-Jackson Atlanta Intl", "Atlanta", "GA"),
    "LAX": ("Los Angeles Intl", "Los Angeles", "CA"),
    "ORD": ("O'Hare Intl", "Chicago", "IL"),
    "DFW": ("Dallas/Fort Worth Intl", "Dallas", "TX"),
    "DEN": ("Denver Intl", "Denver", "CO"),
    "JFK": ("John F. Kennedy Intl", "New York", "NY"),
    "SFO": ("San Francisco Intl", "San Francisco", "CA"),
    "SEA": ("Seattle-Tacoma Intl", "Seattle", "WA"),
    "LAS": ("Harry Reid Intl", "Las Vegas", "NV"),
    "MCO": ("Orlando Intl", "Orlando", "FL"),
    "EWR": ("Newark Liberty Intl", "Newark", "NJ"),
    "MIA": ("Miami Intl", "Miami", "FL"),
    "PHX": ("Phoenix Sky Harbor Intl", "Phoenix", "AZ"),
    "IAH": ("George Bush Intercontinental", "Houston", "TX"),
    "BOS": ("Logan Intl", "Boston", "MA"),
    "MSP": ("Minneapolis-St. Paul Intl", "Minneapolis", "MN"),
    "DTW": ("Detroit Metropolitan Wayne County", "Detroit", "MI"),
    "PHL": ("Philadelphia Intl", "Philadelphia", "PA"),
    "LGA": ("LaGuardia", "New York", "NY"),
    "CLT": ("Charlotte Douglas Intl", "Charlotte", "NC"),
    "SLC": ("Salt Lake City Intl", "Salt Lake City", "UT"),
    "BWI": ("Baltimore/Washington Intl", "Baltimore", "MD"),
    "MDW": ("Chicago Midway Intl", "Chicago", "IL"),
    "DCA": ("Ronald Reagan Washington National", "Washington", "DC"),
    "IAD": ("Washington Dulles Intl", "Washington", "DC"),
    "HNL": ("Daniel K. Inouye Intl", "Honolulu", "HI"),
    "AUS": ("Austin-Bergstrom Intl", "Austin", "TX"),
    "SAN": ("San Diego Intl", "San Diego", "CA"),
    "TPA": ("Tampa Intl", "Tampa", "FL"),
    "PDX": ("Portland Intl", "Portland", "OR"),
}


def percentile_stats(series: pd.Series) -> dict:
    arr = series.dropna().values
    if len(arr) == 0:
        return {}
    return {
        "count": int(len(arr)),
        "mean": round(float(np.mean(arr)), 2),
        "median": round(float(np.percentile(arr, 50)), 2),
        "p75": round(float(np.percentile(arr, 75)), 2),
        "p90": round(float(np.percentile(arr, 90)), 2),
        "p95": round(float(np.percentile(arr, 95)), 2),
        "p99": round(float(np.percentile(arr, 99)), 2),
    }


def load_all(raw_dir: Path) -> pd.DataFrame:
    files = sorted(raw_dir.glob("ontime_*.parquet"))
    if not files:
        raise FileNotFoundError(f"No parquet files found in {raw_dir}. Run download_bts.py first.")
    print(f"Loading {len(files)} parquet files…")
    chunks = [pd.read_parquet(f) for f in files]
    df = pd.concat(chunks, ignore_index=True)
    print(f"Total rows: {len(df):,}")
    return df


def build_airlines(df: pd.DataFrame) -> list[dict]:
    result = []
    for carrier, grp in df.groupby("Reporting_Airline"):
        stats = percentile_stats(grp["TaxiOut"])
        stats["pct_over_30"] = round(float((grp["TaxiOut"] > 30).mean()), 4)
        # On-time trap: marked on-time at gate (DepDel15==0) but taxi-out >= 15 min
        on_time_mask = grp["DepDel15"] == 0
        if on_time_mask.sum() > 0:
            trap = float((grp.loc[on_time_mask, "TaxiOut"] >= TRAP_THRESHOLD).mean())
        else:
            trap = 0.0
        stats["pct_gate_ontime_tarmac_delayed"] = round(trap, 4)
        stats["carrier_code"] = carrier
        stats["carrier_name"] = AIRLINE_NAMES.get(carrier, carrier)
        result.append(stats)
    return sorted(result, key=lambda x: x["median"])


def build_airports(df: pd.DataFrame, min_flights: int = 5000) -> list[dict]:
    result = []
    for airport, grp in df.groupby("Origin"):
        if len(grp) < min_flights:
            continue
        if airport not in AIRPORT_NAMES:
            continue
        name, city, state = AIRPORT_NAMES[airport]
        stats = percentile_stats(grp["TaxiOut"])
        stats["pct_over_30"] = round(float((grp["TaxiOut"] > 30).mean()), 4)
        on_time_mask = grp["DepDel15"] == 0
        if on_time_mask.sum() > 0:
            trap = float((grp.loc[on_time_mask, "TaxiOut"] >= TRAP_THRESHOLD).mean())
        else:
            trap = 0.0
        stats["pct_gate_ontime_tarmac_delayed"] = round(trap, 4)
        stats["airport_code"] = airport
        stats["airport_name"] = name
        stats["city"] = city
        stats["state"] = state
        result.append(stats)
    return sorted(result, key=lambda x: x["median"])


def build_trends(df: pd.DataFrame) -> list[dict]:
    result = []
    for (year, month, carrier), grp in df.groupby(["Year", "Month", "Reporting_Airline"]):
        if len(grp) < 100:
            continue
        on_time = grp[grp["DepDel15"] == 0]
        trap = float((on_time["TaxiOut"] >= TRAP_THRESHOLD).mean()) if len(on_time) else 0.0
        result.append({
            "year": int(year),
            "month": int(month),
            "carrier_code": carrier,
            "median": round(float(grp["TaxiOut"].median()), 2),
            "p90": round(float(grp["TaxiOut"].quantile(0.90)), 2),
            "p95": round(float(grp["TaxiOut"].quantile(0.95)), 2),
            "trap_rate": round(trap, 4),
            "count": int(len(grp)),
        })
    return sorted(result, key=lambda x: (x["year"], x["month"], x["carrier_code"]))


def add_derived(df: pd.DataFrame) -> pd.DataFrame:
    """Add day-of-week, time-of-day bucket, and taxi-out bin index columns."""
    df = df.copy()
    df["dow"] = pd.to_datetime(
        dict(year=df["Year"], month=df["Month"], day=df["DayofMonth"]),
        errors="coerce",
    ).dt.weekday
    hour = (df["CRSDepTime"].fillna(0).astype(int) // 100).clip(0, 23)
    df["tod"] = (hour // 6).clip(0, 3)
    df["binidx"] = pd.cut(df["TaxiOut"], bins=BIN_EDGES, right=False, labels=False)
    df["binidx"] = df["binidx"].clip(0, NBINS - 1).astype("Int64")
    df = df[df["dow"].notna() & df["binidx"].notna()]
    return df


def build_routes(df: pd.DataFrame, top_n: int = 120, min_route: int = 2000,
                 min_carrier: int = 200) -> dict:
    """Per-route taxi-out histograms sliced by airline x day-of-week x time-of-day."""
    counts = df.groupby(["Origin", "Dest"]).size().sort_values(ascending=False)
    top = counts[counts >= min_route].head(top_n).index

    routes = {}
    for origin, dest in top:
        sub = df[(df["Origin"] == origin) & (df["Dest"] == dest)]
        airlines = {}
        for carrier, cg in sub.groupby("Reporting_Airline"):
            if len(cg) < min_carrier:
                continue
            cells = [[{"h": [0] * NBINS, "g": [0] * NBINS} for _ in range(4)] for _ in range(7)]
            for (d, t, b), n in cg.groupby(["dow", "tod", "binidx"]).size().items():
                cells[int(d)][int(t)]["h"][int(b)] = int(n)
            on_time = cg[cg["DepDel15"] == 0]
            for (d, t, b), n in on_time.groupby(["dow", "tod", "binidx"]).size().items():
                cells[int(d)][int(t)]["g"][int(b)] = int(n)
            airlines[carrier] = {"name": AIRLINE_NAMES.get(carrier, carrier), "cells": cells}
        if airlines:
            routes[f"{origin}-{dest}"] = {"origin": origin, "dest": dest, "airlines": airlines}

    return {
        "bin_edges": BIN_EDGES,
        "tod_labels": TOD_LABELS,
        "dow_labels": DOW_LABELS,
        "routes": routes,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data-pipeline/raw")
    parser.add_argument("--output", default="public/data")
    args = parser.parse_args()

    raw_dir = Path(args.input)
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = load_all(raw_dir)

    # Find data_through from max year/month in dataset
    max_year = int(df["Year"].max())
    max_month = int(df.loc[df["Year"] == max_year, "Month"].max())
    data_through = f"{max_year}-{max_month:02d}"

    print("Building airline stats…")
    airlines = build_airlines(df)

    print("Building airport stats…")
    airports = build_airports(df)

    print("Building monthly trends…")
    trends = build_trends(df)

    summary = {
        "last_updated": date.today().isoformat(),
        "data_through": data_through,
        "total_flights_analyzed": len(df),
        "airlines": airlines,
        "airports": airports,
        "trends": trends,
    }

    out_path = out_dir / "summary.json"
    with open(out_path, "w") as f:
        json.dump(summary, f, separators=(",", ":"))

    size_mb = out_path.stat().st_size / 1e6
    print(f"\nWrote {out_path} ({size_mb:.1f} MB)")
    print(f"  {len(airlines)} airlines, {len(airports)} airports, {len(trends)} trend points")

    print("Building route distributions…")
    routes_doc = build_routes(add_derived(df))
    routes_path = out_dir / "routes.json"
    with open(routes_path, "w") as f:
        json.dump(routes_doc, f, separators=(",", ":"))
    rsize = routes_path.stat().st_size / 1e6
    print(f"Wrote {routes_path} ({rsize:.1f} MB, {len(routes_doc['routes'])} routes)")


if __name__ == "__main__":
    main()
