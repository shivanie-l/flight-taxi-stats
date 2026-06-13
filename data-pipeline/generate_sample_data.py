"""
Generate realistic SYNTHETIC sample data matching the production schema, so the
site renders before real BTS data is downloaded. Standard-library only (no pandas/
numpy) so it runs on a stock Python 3.9+.

Outputs:
  public/data/routes.json   — per-route taxi-out histograms, sliced by
                              airline x day-of-week x time-of-day
  public/data/summary.json  — (re)writes the `trends` array with a full monthly
                              time series (median/p90/p95/trap_rate). Airlines and
                              airports arrays are preserved if the file exists.

The REAL pipeline (process_data.py) emits the identical schema from BTS data.
"""
import json
import math
import random
from bisect import bisect_right
from pathlib import Path

random.seed(20240613)

OUT = Path("public/data")
OUT.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Shared bin definition. bin i covers [BIN_EDGES[i], BIN_EDGES[i+1]) minutes.
# The final edge (999) represents the open-ended "120+ min" bucket.
# 15 is an edge so we can split "on-time trap" (taxi-out > 15 min) cleanly.
# ---------------------------------------------------------------------------
BIN_EDGES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 120, 999]
NBINS = len(BIN_EDGES) - 1
TOD_LABELS = ["Early (12a-6a)", "Morning (6a-12p)", "Afternoon (12p-6p)", "Evening (6p-12a)"]
TOD_MULT = [0.85, 1.12, 1.05, 0.98]
DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DOW_MULT = [1.04, 1.0, 1.0, 1.06, 1.1, 0.9, 0.92]

AIRLINE_NAMES = {
    "AA": "American Airlines", "AS": "Alaska Airlines", "B6": "JetBlue",
    "DL": "Delta Air Lines", "F9": "Frontier Airlines", "NK": "Spirit Airlines",
    "UA": "United Airlines", "WN": "Southwest Airlines",
}

# Base median taxi-out (minutes) by origin airport.
ORIGIN_BASE = {
    "SAN": 11, "SFO": 17, "LAX": 16, "JFK": 22, "ORD": 18, "LGA": 21,
    "ATL": 17, "MCO": 13, "SEA": 13, "DEN": 14, "PHX": 15, "BOS": 16,
    "DCA": 14, "DFW": 16,
}

# Per-airline median offset (minutes) and gate-on-time propensity.
AIRLINE_OFFSET = {
    "WN": -1.0, "AS": -1.5, "B6": 1.0, "DL": 1.0,
    "F9": 0.5, "NK": 0.5, "UA": 1.5, "AA": 2.0,
}

# Directional routes -> participating carriers.
ROUTES = {
    ("SAN", "SFO"): ["UA", "AS", "WN"],
    ("SFO", "SAN"): ["UA", "AS", "WN"],
    ("LAX", "JFK"): ["AA", "DL", "B6", "UA"],
    ("JFK", "LAX"): ["AA", "DL", "B6", "UA"],
    ("SFO", "JFK"): ["UA", "B6", "DL"],
    ("JFK", "SFO"): ["UA", "B6", "DL"],
    ("ORD", "LGA"): ["AA", "UA", "DL"],
    ("LGA", "ORD"): ["AA", "UA", "DL"],
    ("ATL", "MCO"): ["DL", "WN", "F9"],
    ("MCO", "ATL"): ["DL", "WN", "F9"],
    ("SEA", "SFO"): ["AS", "UA", "DL"],
    ("SFO", "SEA"): ["AS", "UA", "DL"],
    ("DEN", "PHX"): ["WN", "UA", "F9"],
    ("PHX", "DEN"): ["WN", "UA", "F9"],
    ("BOS", "DCA"): ["AA", "DL", "B6"],
    ("DCA", "BOS"): ["AA", "DL", "B6"],
    ("DFW", "LAX"): ["AA", "WN", "DL"],
    ("LAX", "DFW"): ["AA", "WN", "DL"],
    ("SEA", "LAX"): ["AS", "DL", "WN"],
    ("LAX", "SEA"): ["AS", "DL", "WN"],
}


def bin_index(minutes: float) -> int:
    i = bisect_right(BIN_EDGES, minutes) - 1
    return max(0, min(NBINS - 1, i))


def sample_cell(median_target: float, n: int):
    """Draw n taxi-out samples (lognormal) and split into full + gate-on-time
    histograms. Returns (hist, gate_ontime_hist)."""
    sigma = 0.42
    mu = math.log(max(5.0, median_target))
    gate_ontime_prob = max(0.45, 0.85 - (median_target - 12) * 0.018)
    hist = [0] * NBINS
    gate_hist = [0] * NBINS
    for _ in range(n):
        x = random.lognormvariate(mu, sigma)
        # occasional long ground holds
        if random.random() < 0.02:
            x *= random.uniform(1.6, 3.2)
        b = bin_index(x)
        hist[b] += 1
        # Whether the flight pushed back on time at the gate (independent-ish).
        if random.random() < gate_ontime_prob:
            gate_hist[b] += 1
    return hist, gate_hist


def build_routes():
    routes = {}
    for (origin, dest), carriers in ROUTES.items():
        rid = f"{origin}-{dest}"
        base = ORIGIN_BASE[origin]
        airlines = {}
        for c in carriers:
            offset = AIRLINE_OFFSET[c]
            # route-level popularity for this carrier
            carrier_pop = random.uniform(0.7, 1.4)
            cells = []
            for d in range(7):
                row = []
                for t in range(4):
                    median_target = max(6.0, (base + offset) * TOD_MULT[t] * DOW_MULT[d])
                    # add small per-cell noise
                    median_target *= random.uniform(0.95, 1.07)
                    n = int(max(40, 320 * carrier_pop * (0.7 if d >= 5 else 1.0) *
                                (0.5 if t == 0 else 1.0)))
                    hist, gate_hist = sample_cell(median_target, n)
                    row.append({"h": hist, "g": gate_hist})
                cells.append(row)
            airlines[c] = {"name": AIRLINE_NAMES[c], "cells": cells}
        routes[rid] = {"origin": origin, "dest": dest, "airlines": airlines}
    return routes


def build_trends(airlines_summary):
    """Monthly time series 2022-01 .. 2024-03 for each carrier."""
    months = []
    for year in (2022, 2023, 2024):
        for m in range(1, 13):
            if year == 2024 and m > 3:
                break
            months.append((year, m))

    # baseline median per carrier from the summary airlines array
    base_median = {a["carrier_code"]: a["median"] for a in airlines_summary}
    base_trap = {a["carrier_code"]: a["pct_gate_ontime_tarmac_delayed"] for a in airlines_summary}

    trends = []
    for i, (year, month) in enumerate(months):
        # seasonal bump in summer (Jun-Aug) + slow secular creep upward
        seasonal = 1.0 + 0.12 * math.exp(-((month - 7) ** 2) / 6.0)
        secular = 1.0 + 0.015 * i
        for code in base_median:
            med = base_median[code] * seasonal * secular * random.uniform(0.96, 1.04)
            p90 = med * random.uniform(1.9, 2.2)
            p95 = med * random.uniform(2.5, 2.9)
            trap = min(0.45, base_trap[code] * seasonal * random.uniform(0.9, 1.12))
            trends.append({
                "year": year, "month": month, "carrier_code": code,
                "median": round(med, 2), "p90": round(p90, 2), "p95": round(p95, 2),
                "trap_rate": round(trap, 4),
                "count": int(random.uniform(60000, 160000)),
            })
    return trends


def main():
    # routes.json
    routes = build_routes()
    routes_doc = {
        "bin_edges": BIN_EDGES,
        "tod_labels": TOD_LABELS,
        "dow_labels": DOW_LABELS,
        "routes": routes,
    }
    rpath = OUT / "routes.json"
    rpath.write_text(json.dumps(routes_doc, separators=(",", ":")))
    print(f"Wrote {rpath} ({rpath.stat().st_size/1e6:.2f} MB, {len(routes)} routes)")

    # enrich summary.json trends in place
    spath = OUT / "summary.json"
    summary = json.loads(spath.read_text())
    summary["trends"] = build_trends(summary["airlines"])
    spath.write_text(json.dumps(summary, separators=(",", ":")))
    print(f"Updated {spath} trends -> {len(summary['trends'])} points")


if __name__ == "__main__":
    main()
