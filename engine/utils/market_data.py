# Market data loader
#
# Parses the two market data files in data/ and exposes clean monthly series:
#   get_nifty_monthly_returns()   -- list of monthly % returns, Jan 2014 to Mar 2026
#   get_tbill_monthly_rf()        -- list of monthly risk-free rates (decimal), Oct 2015 to Mar 2025
#   get_aligned_series(start, end)-- both series aligned to the same date range
#
# Data files:
#   data/nifty50_weekly.csv       -- weekly Nifty 50 closing prices (Investing.com format)
#   data/tbill_91day_weekly.csv   -- weekly 91-day T-bill futures prices (100 - yield)

import os
import csv
from datetime import datetime
from collections import defaultdict

from pathlib import Path
DATA_DIR = str(Path(__file__).resolve().parent.parent / 'data')

_nifty_cache  = None
_tbill_cache  = None


def _parse_price(s: str) -> float:
    return float(s.replace(',', '').strip())


def _parse_date(s: str) -> datetime:
    return datetime.strptime(s.strip(), '%d-%m-%Y')


def _load_nifty_monthly() -> list:
    """
    Load nifty50_weekly.csv and convert to monthly return series.
    Returns list of dicts: {year, month, return_pct, close}
    Sorted oldest first.
    """
    path = os.path.join(DATA_DIR, 'nifty50_weekly.csv')
    if not os.path.exists(path):
        return []

    rows = []
    with open(path, encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            try:
                rows.append({
                    'date':  _parse_date(r['Date']),
                    'close': _parse_price(r['Price']),
                })
            except (ValueError, KeyError):
                continue

    rows.sort(key=lambda x: x['date'])

    # Group by year-month, take last close of each month
    monthly = defaultdict(list)
    for r in rows:
        monthly[(r['date'].year, r['date'].month)].append(r['close'])

    keys = sorted(monthly.keys())
    result = []
    for i in range(1, len(keys)):
        prev_close = monthly[keys[i - 1]][-1]
        curr_close = monthly[keys[i]][-1]
        ret = (curr_close / prev_close - 1) * 100
        result.append({
            'year':       keys[i][0],
            'month':      keys[i][1],
            'return_pct': round(ret, 4),
            'close':      round(curr_close, 2),
        })

    return result


def _load_tbill_monthly() -> list:
    """
    Load tbill_91day_weekly.csv and convert to monthly risk-free rate series.

    Convention: futures price = 100 - annualised yield (discount rate)
    So annualised yield % = 100 - price
    Monthly rf = (1 + annual_yield/100)^(1/12) - 1

    Returns list of dicts: {year, month, annual_yield_pct, monthly_rf_pct}
    Sorted oldest first.
    """
    path = os.path.join(DATA_DIR, 'tbill_91day_weekly.csv')
    if not os.path.exists(path):
        return []

    rows = []
    with open(path, encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            try:
                price     = float(r['Price'].strip())
                yield_ann = 100 - price         # annualised yield %
                rows.append({
                    'date':      _parse_date(r['Date']),
                    'yield_ann': yield_ann,
                })
            except (ValueError, KeyError):
                continue

    rows.sort(key=lambda x: x['date'])

    # Average all readings within each month
    monthly = defaultdict(list)
    for r in rows:
        monthly[(r['date'].year, r['date'].month)].append(r['yield_ann'])

    result = []
    for (year, month), yields in sorted(monthly.items()):
        avg_yield = sum(yields) / len(yields)
        monthly_rf = ((1 + avg_yield / 100) ** (1 / 12) - 1) * 100
        result.append({
            'year':            year,
            'month':           month,
            'annual_yield_pct': round(avg_yield, 4),
            'monthly_rf_pct':   round(monthly_rf, 6),
        })

    return result


def get_nifty_monthly_returns() -> list:
    """Return cached Nifty 50 monthly return series (oldest first)."""
    global _nifty_cache
    if _nifty_cache is None:
        _nifty_cache = _load_nifty_monthly()
    return _nifty_cache


def get_tbill_monthly_rf() -> list:
    """Return cached T-bill monthly risk-free rate series (oldest first)."""
    global _tbill_cache
    if _tbill_cache is None:
        _tbill_cache = _load_tbill_monthly()
    return _tbill_cache


def get_aligned_series(start_year: int = 2015,
                       start_month: int = 10,
                       end_year: int   = 2025,
                       end_month: int  = 3) -> dict:
    """
    Return Nifty returns and T-bill rf rates aligned to the same date range.
    Defaults to the overlap period: Oct 2015 - Mar 2025 (112 months).

    Returns:
        {
            dates:           [(year, month), ...],
            nifty_returns:   [float, ...],    # monthly % returns
            tbill_rf:        [float, ...],    # monthly rf % (decimal basis)
            nifty_ann_cagr:  float,           # annualised return over period
            tbill_avg_ann:   float,           # avg annualised risk-free rate
            n_months:        int,
        }
    """
    nifty  = {(r['year'], r['month']): r['return_pct'] for r in get_nifty_monthly_returns()}
    tbill  = {(r['year'], r['month']): r['monthly_rf_pct'] for r in get_tbill_monthly_rf()}

    dates, nifty_rets, tbill_rfs = [], [], []

    year, month = start_year, start_month
    while (year, month) <= (end_year, end_month):
        key = (year, month)
        if key in nifty and key in tbill:
            dates.append(key)
            nifty_rets.append(nifty[key])
            tbill_rfs.append(tbill[key])
        # advance month
        month += 1
        if month > 12:
            month = 1
            year += 1

    # Annualised stats
    import math
    n = len(nifty_rets)
    cum_nifty  = 1.0
    for r in nifty_rets:
        cum_nifty *= (1 + r / 100)
    ann_cagr = (cum_nifty ** (12 / n) - 1) * 100 if n > 0 else 0

    avg_rf_monthly  = sum(tbill_rfs) / len(tbill_rfs) if tbill_rfs else 0
    avg_rf_annual   = ((1 + avg_rf_monthly / 100) ** 12 - 1) * 100

    return {
        'dates':           dates,
        'nifty_returns':   nifty_rets,
        'tbill_rf':        tbill_rfs,
        'nifty_ann_cagr':  round(ann_cagr, 2),
        'tbill_avg_ann':   round(avg_rf_annual, 2),
        'n_months':        n,
        'start':           dates[0] if dates else None,
        'end':             dates[-1] if dates else None,
    }


def get_summary() -> dict:
    """Return a quick summary of what data is loaded."""
    nifty = get_nifty_monthly_returns()
    tbill = get_tbill_monthly_rf()
    return {
        'nifty': {
            'months':    len(nifty),
            'start':     f"{nifty[0]['year']}-{nifty[0]['month']:02d}"  if nifty else None,
            'end':       f"{nifty[-1]['year']}-{nifty[-1]['month']:02d}" if nifty else None,
        },
        'tbill': {
            'months':    len(tbill),
            'start':     f"{tbill[0]['year']}-{tbill[0]['month']:02d}"  if tbill else None,
            'end':       f"{tbill[-1]['year']}-{tbill[-1]['month']:02d}" if tbill else None,
            'latest_ann_yield': tbill[-1]['annual_yield_pct'] if tbill else None,
        },
        'overlap_months': len(get_aligned_series()['dates']),
    }
