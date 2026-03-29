# NSE Index Lookup Utility
#
# Builds a symbol -> {cap, company, industry, isin, indices} lookup
# from the four official NSE index constituent files:
#   data/nifty50.xlsx        -- 50 Large cap stocks
#   data/midcap100.xlsx      -- 100 Mid cap stocks
#   data/smallcap250.xlsx    -- 250 Small cap stocks
#   data/largemidcap250.xlsx -- 250 Large+Mid combined index
#
# Usage:
#   from utils.nse_index import get_cap_category, lookup_symbol, classify_holdings

import os
import zipfile
import xml.etree.ElementTree as ET

from pathlib import Path
DATA_DIR = str(Path(__file__).resolve().parent.parent / 'data')

INDEX_FILES = {
    'Large': 'nifty50.xlsx',
    'Mid':   'midcap100.xlsx',
    'Small': 'smallcap250.xlsx',
}

# Industry name mappings from NSE -> our portfolio sector labels
INDUSTRY_MAP = {
    'Financial Services':               'Banking & Financial',
    'Information Technology':           'Software & Services',
    'Automobile and Auto Components':   'Automobile',
    'Healthcare':                       'Pharma & Biotech',
    'Oil Gas & Consumable Fuels':       'Petroleum Products',
    'Construction':                     'Construction',
    'Construction Materials':           'Construction',
    'Telecommunication':                'Telecom',
    'Fast Moving Consumer Goods':       'FMCG',
    'Capital Goods':                    'Capital Goods',
    'Metals & Mining':                  'Metals & Mining',
    'Power':                            'Power',
    'Consumer Durables':                'Consumer Durables',
    'Consumer Services':                'Consumer Services',
    'Chemicals':                        'Chemicals',
    'Realty':                           'Real Estate',
    'Services':                         'Services',
    'Textiles':                         'Textiles',
    'Media Entertainment & Publication':'Media',
    'Diversified':                      'Diversified',
    'Forest Materials':                 'Forest Materials',
}

_cache = None  # module-level cache


def _read_xlsx(path: str) -> list:
    """Parse an xlsx file (stored with .xlsx extension even if named .csv)."""
    with zipfile.ZipFile(path) as z:
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            ns = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in tree.findall('x:si', ns):
                t = si.find('.//x:t', ns)
                strings.append(t.text if t is not None else '')

        tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        ns = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        rows = []
        for row in tree.findall('.//x:row', ns):
            cells = []
            for c in row.findall('x:c', ns):
                t = c.get('t', '')
                v = c.find('x:v', ns)
                if v is None:
                    cells.append('')
                elif t == 's':
                    cells.append(strings[int(v.text)])
                else:
                    cells.append(v.text)
            rows.append(cells)
        return rows


def _build_lookup() -> dict:
    """Build the full symbol lookup dict from all index files."""
    lookup = {}

    for cap, filename in INDEX_FILES.items():
        path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(path):
            continue
        rows = _read_xlsx(path)
        for row in rows[1:]:  # skip header
            if len(row) < 5:
                continue
            company, industry, symbol, series, isin = row[0], row[1], row[2], row[3], row[4]
            if not symbol:
                continue
            if symbol not in lookup:
                lookup[symbol] = {
                    'company':  company,
                    'industry': industry,
                    'sector':   INDUSTRY_MAP.get(industry, industry),
                    'isin':     isin,
                    'cap':      cap,
                    'indices':  [cap],
                }
            else:
                # Symbol appears in multiple indices -- keep lowest cap,
                # but track all indices it belongs to
                if cap not in lookup[symbol]['indices']:
                    lookup[symbol]['indices'].append(cap)

    return lookup


def get_lookup() -> dict:
    """Return the cached lookup dict, building it on first call."""
    global _cache
    if _cache is None:
        _cache = _build_lookup()
    return _cache


def lookup_symbol(symbol: str) -> dict | None:
    """
    Look up a stock symbol.

    Returns dict with keys: company, industry, sector, isin, cap, indices
    Returns None if symbol not found in any NSE index.
    """
    return get_lookup().get(symbol.upper())


def get_cap_category(symbol: str) -> str:
    """
    Return 'Large', 'Mid', 'Small', or 'Unknown' for a given NSE symbol.
    Priority: Large > Mid > Small (a stock in multiple indices gets the largest cap).
    """
    info = lookup_symbol(symbol)
    if not info:
        return 'Unknown'
    caps = info.get('indices', [info['cap']])
    for c in ('Large', 'Mid', 'Small'):
        if c in caps:
            return c
    return 'Unknown'


def classify_holdings(holdings: list) -> list:
    """
    Enrich a holdings list with real NSE cap category and sector data.

    holdings: list of dicts, each with at least {'symbol': 'HDFCBANK', 'current_value': 1000}

    Returns the same list with 'cap_category', 'sector', 'company' fields added/updated.
    """
    lk = get_lookup()
    enriched = []
    for h in holdings:
        sym = h.get('symbol', '').upper()
        info = lk.get(sym)
        h = dict(h)
        if info:
            h['cap_category'] = info['cap']
            h['sector']       = info['sector']
            h['industry']     = info['industry']
            h['company']      = info['company']
            h['in_nse_index'] = True
        else:
            h.setdefault('cap_category', 'Unknown')
            h['in_nse_index'] = False
        enriched.append(h)
    return enriched


def get_index_stats() -> dict:
    """Return counts and industries represented in each index."""
    lk = get_lookup()
    stats = {'Large': [], 'Mid': [], 'Small': []}
    for sym, info in lk.items():
        stats[info['cap']].append(info['industry'])

    return {
        cap: {
            'count':      len(industries),
            'industries': sorted(set(industries)),
        }
        for cap, industries in stats.items()
    }


def search_by_industry(industry_keyword: str) -> list:
    """Find all stocks whose NSE industry contains the keyword (case-insensitive)."""
    lk = get_lookup()
    kw = industry_keyword.lower()
    return [
        {'symbol': sym, **info}
        for sym, info in lk.items()
        if kw in info['industry'].lower()
    ]
