import argparse
import os
import warnings
from datetime import date, datetime

import joblib
import numpy as np
import pandas as pd
from datetime import timedelta

warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────────────────────────────────────
# 1.  CONSTANTS  (must match training order exactly)
# ─────────────────────────────────────────────────────────────────────────────

FEATURE_NAMES = [
    "day_of_week", "month", "is_weekend",
    "demand_lag_1d", "demand_lag_7d",
    "rolling_7d_mean", "diff_1d", "diff_7d",
    "ratio_7d", "rolling_diff",
    "state_Andhra Pradesh", "state_Arunachal Pradesh", "state_Assam",
    "state_Bihar", "state_Chandigarh", "state_Chhattisgarh", "state_DNH",
    "state_Delhi", "state_Goa", "state_Gujarat", "state_HP", "state_Haryana",
    "state_J&K", "state_Jharkhand", "state_Karnataka", "state_Kerala",
    "state_MP", "state_Maharashtra", "state_Manipur", "state_Meghalaya",
    "state_Mizoram", "state_Nagaland", "state_Odisha", "state_Pondy",
    "state_Punjab", "state_Rajasthan", "state_Sikkim", "state_Tamil Nadu",
    "state_Telangana", "state_Tripura", "state_UP", "state_Uttarakhand",
    "state_West Bengal",
    "season_monsoon", "season_summer", "season_winter",
]

STATE_NAME_MAP = {
    "Andhra Pradesh":        "state_Andhra Pradesh",
    "Arunachal Pradesh":     "state_Arunachal Pradesh",
    "Assam":                 "state_Assam",
    "Bihar":                 "state_Bihar",
    "Chandigarh":            "state_Chandigarh",
    "Chhattisgarh":          "state_Chhattisgarh",
    "DNHDDPDCL":             "state_DNH",
    "DNH":                   "state_DNH",
    "Delhi":                 "state_Delhi",
    "Goa":                   "state_Goa",
    "Gujarat":               "state_Gujarat",
    "HP":                    "state_HP",
    "Haryana":               "state_Haryana",
    "J&K(UT) & Ladakh(UT)":  "state_J&K",
    "J&K":                   "state_J&K",
    "Jharkhand":             "state_Jharkhand",
    "Karnataka":             "state_Karnataka",
    "Kerala":                "state_Kerala",
    "MP":                    "state_MP",
    "Maharashtra":           "state_Maharashtra",
    "Manipur":               "state_Manipur",
    "Meghalaya":             "state_Meghalaya",
    "Mizoram":               "state_Mizoram",
    "Nagaland":              "state_Nagaland",
    "Odisha":                "state_Odisha",
    "Puducherry":            "state_Pondy",
    "Pondy":                 "state_Pondy",
    "Punjab":                "state_Punjab",
    "Rajasthan":             "state_Rajasthan",
    "Sikkim":                "state_Sikkim",
    "Tamil Nadu":            "state_Tamil Nadu",
    "Telangana":             "state_Telangana",
    "Tripura":               "state_Tripura",
    "UP":                    "state_UP",
    "Uttarakhand":           "state_Uttarakhand",
    "West Bengal":           "state_West Bengal",
}


# ─────────────────────────────────────────────────────────────────────────────
# 2.  CSV PARSER
# ─────────────────────────────────────────────────────────────────────────────

def _safe_float(v) -> float:
    try:
        return float(str(v).replace(",", "").strip())
    except Exception:
        return np.nan


def parse_nldc_csv(csv_path: str) -> dict:
    raw = pd.read_csv(csv_path, header=None, dtype=str)
    result = {
        "report_date": None,
        "all_india": {},
        "regional": {},
        "states": {},
        "sourcewise_gen": {},
        "transnational": {},
        "frequency": {},
    }

    # ── Report date ───────────────────────────────────────────────────
    for _, row in raw.iterrows():
        for cell in row:
            cell_s = str(cell).strip()
            for fmt in ("%d-%b-%Y", "%d-%B-%Y", "%d/%m/%Y"):
                try:
                    result["report_date"] = datetime.strptime(cell_s, fmt).date()
                    break
                except ValueError:
                    pass
        if result["report_date"]:
            break

    if result["report_date"] is None:
        fname = os.path.basename(csv_path)
        parts = fname.split("_")
        if len(parts) >= 3:
            try:
                result["report_date"] = datetime.strptime("_".join(parts[:3]), "%y_%m_%d").date()
            except ValueError:
                pass

    # ── Find region header row ────────────────────────────────────────
    regions = ["NR", "WR", "SR", "ER", "NER", "TOTAL"]
    header_row_idx = None
    region_col = {}
    for i, row in raw.iterrows():
        cells = [str(c).strip() for c in row]
        if sum(1 for r in regions if r in cells) >= 4:
            header_row_idx = i
            for r in regions:
                if r in cells:
                    region_col[r] = cells.index(r)
            break

    # ── Section A: All-India / Regional summary ───────────────────────
    SECTION_A_KEYS = {
        "Demand Met during Evening Peak": "peak_demand_mw",
        "Peak Shortage":                  "peak_shortage_mw",
        "Energy Met (MU)":                "energy_met_mu",
        "Hydro Gen (MU)":                 "hydro_gen_mu",
        "Wind Gen (MU)":                  "wind_gen_mu",
        "Solar Gen (MU)":                 "solar_gen_mu",
        "Energy Shortage (MU)":           "energy_shortage_mu",
        "Maximum Demand Met During":      "max_demand_day_mw",
    }
    if header_row_idx is not None:
        for i in range(header_row_idx + 1, min(header_row_idx + 15, len(raw))):
            row = raw.iloc[i]
            label = str(row.iloc[0]).strip()
            for key, feat in SECTION_A_KEYS.items():
                if key in label:
                    regional_vals = {r: _safe_float(row.iloc[c]) for r, c in region_col.items()}
                    result["all_india"][feat] = regional_vals.get("TOTAL", np.nan)
                    result["regional"][feat]  = {r: regional_vals.get(r, np.nan) for r in regions[:-1]}
                    break

    # ── Section C: State-level data ───────────────────────────────────
    in_section_c = False
    for i, row in raw.iterrows():
        label = str(row.iloc[0]).strip()
        if "Power Supply Position in States" in label:
            in_section_c = True
            continue
        if in_section_c and ("Transnational" in label or "Import/Export" in label):
            break
        if in_section_c:
            state_name = str(row.iloc[1]).strip()
            if state_name in STATE_NAME_MAP:
                result["states"][state_name] = {
                    "max_demand_mw":      _safe_float(row.iloc[2]),
                    "shortage_mw":        _safe_float(row.iloc[3]),
                    "energy_met_mu":      _safe_float(row.iloc[4]),
                    "drawal_mu":          _safe_float(row.iloc[5]),
                    "od_ud_mu":           _safe_float(row.iloc[6]),
                    "energy_shortage_mu": _safe_float(row.iloc[8]) if len(row) > 8 else np.nan,
                }

    # ── Section G: Source-wise generation ────────────────────────────
    SOURCES = ["Coal", "Lignite", "Hydro", "Nuclear", "Gas", "RES", "Total"]
    in_section_g = False
    for i, row in raw.iterrows():
        label = str(row.iloc[0]).strip()
        if "Sourcewise generation" in label:
            in_section_g = True
            continue
        if in_section_g and label not in ("", "nan", "NaN"):
            source_key = next((s for s in SOURCES if s in label), label)
            vals = [_safe_float(v) for v in row]
            finite = [v for v in vals if not np.isnan(v)]
            if len(finite) >= 2:
                result["sourcewise_gen"][source_key] = finite[-2]
            if "Total" in label:
                break

    return result


# ─────────────────────────────────────────────────────────────────────────────
# 3.  FEATURE ENGINEERING
# ─────────────────────────────────────────────────────────────────────────────

def _get_season(d: date) -> str:
    m = d.month
    if m in (6, 7, 8, 9):  return "monsoon"
    if m in (3, 4, 5):     return "summer"
    if m in (11, 12, 1, 2): return "winter"
    return "other"


def build_feature_row(
    state_name: str,
    energy_met_mu: float,
    report_date: date,
    history_df: pd.DataFrame = None,
) -> pd.Series:
    row = {f: 0.0 for f in FEATURE_NAMES}
    rng = np.random.default_rng(seed=int(abs(energy_met_mu) * 100) % (2**31))

    # Calendar features
    dt = pd.Timestamp(report_date)
    row["day_of_week"] = float(dt.dayofweek)
    row["month"]       = float(dt.month)
    row["is_weekend"]  = 1.0 if dt.dayofweek >= 5 else 0.0

    # Season one-hot
    season = _get_season(report_date)
    if season != "other":
        row[f"season_{season}"] = 1.0

    # State one-hot
    feat_col = STATE_NAME_MAP.get(state_name)
    if feat_col and feat_col in row:
        row[feat_col] = 1.0

    # Lag features
    lag_1d, lag_7d, hist_vals = np.nan, np.nan, []

    if history_df is not None and not history_df.empty:
        sh = history_df[history_df["state"] == state_name].copy()
        sh["date"] = pd.to_datetime(sh["date"])
        sh = sh.sort_values("date")
        target = pd.Timestamp(report_date)

        r1 = sh[sh["date"] == target - pd.Timedelta(days=1)]
        if not r1.empty:
            lag_1d = float(r1["energy_met_mu"].iloc[-1])

        r7 = sh[sh["date"] == target - pd.Timedelta(days=7)]
        if not r7.empty:
            lag_7d = float(r7["energy_met_mu"].iloc[-1])

        hist_vals = sh[sh["date"] < target].tail(7)["energy_met_mu"].dropna().tolist()

    # Approximation when history is missing
    if np.isnan(lag_1d):
        lag_1d = energy_met_mu * rng.uniform(0.97, 1.03)

    if np.isnan(lag_7d):
        lag_7d = energy_met_mu * rng.uniform(0.93, 1.07)

    if len(hist_vals) < 7:
        hist_vals = (energy_met_mu * rng.uniform(0.94, 1.06, size=7)).tolist()

    rolling_7d_mean = float(np.mean(hist_vals))

    row["demand_lag_1d"]   = lag_1d
    row["demand_lag_7d"]   = lag_7d
    row["rolling_7d_mean"] = rolling_7d_mean
    row["diff_1d"]         = energy_met_mu - lag_1d
    row["diff_7d"]         = energy_met_mu - lag_7d
    row["ratio_7d"]        = energy_met_mu / rolling_7d_mean if rolling_7d_mean else 1.0
    row["rolling_diff"]    = lag_1d - lag_7d

    return pd.Series(row, index=FEATURE_NAMES, dtype=float)


# ─────────────────────────────────────────────────────────────────────────────
# 4.  MODEL LOADING & INFERENCE
# ─────────────────────────────────────────────────────────────────────────────

def load_models(models_dir: str) -> dict:
    models = {}
    for name, fname in [("scaler", "scaler.pkl"), ("rf", "rf_model.pkl"),
                         ("xgb", "xgb_model.pkl"), ("iso_forest", "isolation_forest.pkl")]:
        path = os.path.join(models_dir, fname)
        if os.path.exists(path):
            try:
                models[name] = joblib.load(path)
            except Exception as e:
                pass
    return models


def predict(feature_df: pd.DataFrame, models: dict, rolling_means: list) -> pd.DataFrame:
    scaler = models.get("scaler")
    rf     = models.get("rf")
    xgb    = models.get("xgb")
    iso    = models.get("iso_forest")

    X = feature_df[FEATURE_NAMES].values
    X_s = scaler.transform(X) if scaler else X
    rolls = np.array(rolling_means)
    out = pd.DataFrame()

    if rf:
        r_rf = rf.predict(X_s)
        out["demand_ratio_rf"]       = r_rf
        out["predicted_energy_MU_rf"] = r_rf * rolls

    if xgb:
        try:
            r_xgb = xgb.predict(X_s)
            out["demand_ratio_xgb"]       = r_xgb
            out["predicted_energy_MU_xgb"] = r_xgb * rolls
        except Exception as e:
            pass

    ratio_cols = [c for c in out.columns if c.startswith("demand_ratio_")]
    if len(ratio_cols) >= 2:
        out["demand_ratio_ensemble"]       = out[ratio_cols].mean(axis=1)
        out["predicted_energy_MU_ensemble"] = out["demand_ratio_ensemble"] * rolls

    if iso and "demand_ratio_rf" in out:
        iso_in = out["demand_ratio_rf"].values.reshape(-1, 1)
        try:
            out["is_anomaly"]    = (iso.predict(iso_in) == -1).astype(int)
            out["anomaly_score"] = iso.decision_function(iso_in)
        except Exception as e:
            pass

    if "demand_ratio_rf" in out and "demand_ratio_xgb" in out:
        ratio_diff = (out["demand_ratio_rf"] - out["demand_ratio_xgb"]).abs()
        out["confidence_score"] = np.clip(1.0 - ratio_diff * 2, 0.5, 1.0)

    return out


# ─────────────────────────────────────────────────────────────────────────────
# 5.  FULL PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(csv_path: str, models_dir: str, history_df: pd.DataFrame = None) -> pd.DataFrame:
    parsed = parse_nldc_csv(csv_path)
    report_date = parsed["report_date"]

    rows, names, demands_mw, energy_list, rolling_means = [], [], [], [], []
    for state_raw, sd in parsed["states"].items():
        e_mu = sd.get("energy_met_mu", np.nan)
        d_mw = sd.get("max_demand_mw", np.nan)
        if np.isnan(e_mu) or e_mu <= 0:
            continue
        feat = build_feature_row(state_raw, e_mu, report_date, history_df)
        rows.append(feat)
        names.append(state_raw)
        demands_mw.append(d_mw)
        energy_list.append(e_mu)
        rolling_means.append(feat["rolling_7d_mean"])

    if not rows:
        return pd.DataFrame()

    feature_df = pd.DataFrame(rows, columns=FEATURE_NAMES)
    models = load_models(models_dir)

    pred_df = predict(feature_df, models, rolling_means)
    
    # ── 48h prediction chaining ──
    feature_df_48h = feature_df.copy()
    next_date = report_date + timedelta(days=1)
    dow48 = next_date.weekday()
    season48 = _get_season(next_date)
    
    feature_df_48h["day_of_week"] = float(dow48)
    feature_df_48h["month"] = float(next_date.month)
    feature_df_48h["is_weekend"] = 1.0 if dow48 >= 5 else 0.0
    feature_df_48h["season_monsoon"] = 1.0 if season48 == "monsoon" else 0.0
    feature_df_48h["season_summer"] = 1.0 if season48 == "summer" else 0.0
    feature_df_48h["season_winter"] = 1.0 if season48 == "winter" else 0.0
    
    if "predicted_energy_MU_ensemble" in pred_df:
        demand_24 = pred_df["predicted_energy_MU_ensemble"]
    else:
        demand_24 = pred_df.get("predicted_energy_MU_rf", feature_df["rolling_7d_mean"])
        
    feature_df_48h["demand_lag_1d"] = demand_24
    feature_df_48h["diff_1d"] = demand_24 - feature_df["demand_lag_1d"]
    feature_df_48h["diff_7d"] = demand_24 - feature_df["demand_lag_7d"]
    
    rolling_7d = feature_df["rolling_7d_mean"]
    feature_df_48h["ratio_7d"] = np.where(rolling_7d > 0, demand_24 / rolling_7d, 1.0)
    
    pred_48h_df = predict(feature_df_48h, models, rolling_means)
    
    if "predicted_energy_MU_ensemble" in pred_48h_df:
        pred_df["predicted_energy_MU_48h_ensemble"] = pred_48h_df["predicted_energy_MU_ensemble"]
    else:
        pred_df["predicted_energy_MU_48h_ensemble"] = pred_48h_df.get("predicted_energy_MU_rf", rolling_7d)

    pred_df.insert(0, "state",                names)
    pred_df.insert(1, "report_date",          str(report_date))
    pred_df.insert(2, "actual_energy_met_MU", energy_list)
    pred_df.insert(3, "actual_max_demand_MW", demands_mw)

    return pred_df
