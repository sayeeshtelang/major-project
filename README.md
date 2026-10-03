# ⚡ EnergyIQ — India State-wise Electricity Demand Forecasting & PSO Optimization

A production-ready MERN stack web application for energy demand prediction, future peak load calculation, Particle Swarm Optimization (PSO) economic load dispatch, and automated NLDC PSP report extraction using pre-trained machine learning models.

---

## 🏗️ Architecture

```
Browser (React Frontend — Port 3000 / Vite)
    ↕ REST API
Node.js / Express Backend (Port 5000)
    ↕ HTTP Proxy & Pipeline Ingestion
Flask ML Service (Port 5001)          ← Loads pre-trained scikit-learn models & PSP Extractor
    ↕ Database Operations
MongoDB (Port 27017)                  ← Optional; Built-in In-Memory Fallback
```

---

## 📂 Project Structure

```
mern-energy-project/
├── client/                       # React frontend (Vite / React Router v6)
│   ├── public/index.html
│   └── src/
│       ├── App.js                # App routing (Login, Dashboard, Analytics, Optimization, etc.)
│       ├── index.css             # CSS variables & dark theme styling system
│       ├── services/api.js       # Axios client for backend API communication
│       ├── components/
│       │   ├── Navbar.jsx        # Top header bar
│       │   ├── Sidebar.jsx       # Navigation sidebar with active model indicators
│       │   ├── KPICard.jsx       # Reusable metric card component
│       │   └── Charts/
│       │       ├── DemandChart.jsx
│       │       └── ModelCompareChart.jsx
│       └── pages/
│           ├── Login.js          # Authentication login page
│           ├── ForgotPassword.js # Password reset request page
│           ├── Landing.js        # Public landing hero page
│           ├── Dashboard.jsx     # Main KPI cards (24h Demand, Future Peak MW) + Trend chart / CSV Upload
│           ├── Analytics.jsx     # Historical state demand bar charts & prediction stats
│           ├── Optimization.jsx  # Particle Swarm Optimization (PSO) Economic Load Dispatch
│           ├── UploadCSV.jsx     # NLDC PSP Report parser & batch prediction generator
│           └── Reports.jsx       # PDF & CSV report export engine with PSO dispatch metrics
│
├── server/                       # Node.js + Express backend
│   ├── server.js                 # Server entrypoint & middleware setup
│   ├── .env
│   ├── package.json
│   ├── models/
│   │   └── PredictionLog.js      # Mongoose schema + in-memory store fallback
│   ├── controllers/
│   │   ├── predictController.js  # Prediction & batch save endpoints
│   │   ├── historyController.js  # Prediction history retrieval
│   │   ├── analyticsController.js# Aggregate statistics
│   │   └── exportController.js   # PDF & CSV export handlers
│   ├── routes/
│   │   ├── predict.js
│   │   ├── history.js
│   │   ├── analytics.js
│   │   └── export.js
│   └── services/
│       ├── mlService.js          # Proxy calls to Flask service
│       ├── fallbackService.js    # Rolling 7d mean fallback handler
│       └── exportService.js     # PDFKit & json2csv generation with PSO computation
│
└── ml-service/                   # Python Flask ML service
    ├── app.py                    # Flask API server & inference endpoints
    ├── nldc_psp_extractor.py     # NLDC PSP Report parser & feature engineering engine
    ├── requirements.txt
    ├── scaler.pkl                # StandardScaler (46 features)
    ├── rf_model.pkl              # RandomForestRegressor (200 trees)
    ├── xgb_model.pkl             # XGBoost Regressor (200 trees)
    ├── isolation_forest.pkl      # IsolationForest anomaly model
    ├── feature_names.txt         # List of 46 feature names
    └── cleaned_energy_data_main_.csv # Historical dataset (16,368 records, 33 states)
```

---

## ⚙️ Setup & Execution Instructions

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| Python | ≥ 3.9 |
| scikit-learn | **exactly 1.6.1** (required for `.pkl` binary compatibility) |
| MongoDB | ≥ 6.x (optional — in-memory fallback enabled automatically) |

---

### Step 1 — Start ML Service (Python Flask)

```bash
cd ml-service

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install required dependencies
pip install -r requirements.txt

# Launch ML Service on Port 5001
python app.py
```

**Expected Startup Logs:**
```
2026-xx-xx [INFO] Loading ML models …
2026-xx-xx [INFO] ✅  All models loaded and assertions passed
2026-xx-xx [INFO]     Features : 46
2026-xx-xx [INFO]     RF trees : 200
2026-xx-xx [INFO]     XGB trees: 200
2026-xx-xx [INFO] ✅  Historical data loaded: 16368 rows, 33 states
```

---

### Step 2 — Start Node.js Server (Backend)

```bash
cd server
npm install

# Configure environment variables in server/.env if needed
# PORT=5000
# MONGO_URI=mongodb://localhost:27017/energy_forecasting
# ML_SERVICE_URL=http://localhost:5001

npm run dev
# → Node server running on port 5000
```

---

### Step 3 — Start React Frontend

```bash
cd client
npm install
npm start
# → React app running on http://localhost:3000
```

---

## 🔌 API Reference

### ML Service (Flask — Port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health & loaded models status |
| `POST` | `/predict` | Predict 24h & 48h energy demand (MU) for a state given lag features |
| `POST` | `/anomaly` | Evaluate IsolationForest anomaly score on prediction ratio |
| `POST` | `/batch-predict` | Run multi-day forward predictions for a given state |
| `POST` | `/upload-csv` | Parse uploaded NLDC PSP report (.csv / .xls), extract features, & run batch predictions |
| `GET` | `/historical` | Query raw historical energy readings per state |
| `GET` | `/analytics/summary` | Aggregate historical demand statistics per state |
| `GET` | `/states` | List all 33 supported Indian states/UTs |

---

### Node.js Backend API (Express — Port 5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/predict` | Auto-derive lag features & request 24h/48h predictions from ML service |
| `POST` | `/api/save-batch` | Persist batch predictions (from CSV upload) into database logs |
| `POST` | `/api/anomaly` | Query IsolationForest anomaly classification |
| `GET` | `/api/history` | Query prediction log records (filtered by state/limit) |
| `GET` | `/api/analytics` | Retrieve aggregate state statistics & model summary |
| `GET` | `/api/historical-data` | Proxy historical demand data from Flask ML service |
| `GET` | `/api/export/csv` | Download exported CSV report with PSO dispatch metrics |
| `GET` | `/api/export/pdf` | Download formatted PDF report with summary & PSO generation mix |

---

## 🧠 ML Pipeline & Mathematical Engine

### 1. 24h & 48h Demand Inference Pipeline
```
State + Date Input
    ↓
Auto-derive lag features from historical dataset (demand_lag_1d, demand_lag_7d, rolling_7d_mean)
    ↓
build_feature_row() → 46-feature vector (calendar flags, seasons, state one-hot)
    ↓
scaler.transform() → StandardScaler normalization
    ↓
rf_model.predict()  → RF demand ratio
xgb_model.predict() → XGB demand ratio
    ↓
Ratio × rolling_7d_mean = Predicted Energy Demand (MU)
    ↓
Ensemble Demand = (RF Demand + XGB Demand) / 2
    ↓
IsolationForest Evaluation → Anomaly Flag & Severity Score
    ↓
48h Chained Forecast → Re-runs feature pipeline using 24h RF output as day+1 lag_1d
```

---

### 2. Future Peak Load Calculation (MW)
Converts daily energy consumption ($E_{24h}$ in MU) into predicted peak power demand ($P_{\text{peak}}$ in MW):
$$\text{Average Power (MW)} = \frac{E_{24h} \times 1000}{24}$$
$$P_{\text{peak}} = \left( \frac{\text{Average Power}}{\text{Load Factor}} \right) \times K_{\text{coincidence}} \times (1 + \alpha_{\text{contingency}})$$

- **Grid Load Factor ($\text{LF}$)**: `0.78` (78% typical daily grid load factor)
- **Coincidence Factor ($K_{\text{coincidence}}$)**: `1.12` (12% peak concentration multiplier)
- **Contingency Reserve ($\alpha_{\text{contingency}}$)**: `0.05` (5% spinning reserve & weather allowance)

---

### 3. Particle Swarm Optimization (PSO) for Economic Dispatch
Optimizes generation dispatch across 3 generator types to minimize total fuel cost:
$$\text{Minimize } C_{\text{total}} = \sum_{i=1}^{3} \left( a_i + b_i P_i + c_i P_i^2 \right) + \lambda \left| \sum_{i=1}^{3} P_i - P_{\text{demand}} \right|^2$$

- **Coal Generator**: $P \in [10, 1000]\text{ MW}, a=500, b=15, c=0.05$
- **Gas Generator**: $P \in [10, 1000]\text{ MW}, a=400, b=20, c=0.06$
- **Renewables (Solar/Wind)**: $P \in [0, 500]\text{ MW}, a=0, b=5, c=0.01$
- **Cost Savings (%)**: Evaluated against naive equal generation allocation.

---

## 🚀 Key Features

- **24h & 48h Energy Demand Forecasting** — Multi-model ensemble (Random Forest + XGBoost).
- **Future Peak Load Estimation (MW)** — Converts daily energy (MU) into peak grid load (MW).
- **Particle Swarm Optimization (PSO)** — Economic Load Dispatch optimizing generation mix across Coal, Gas, and Renewables to minimize generation cost per unit (₹/Unit).
- **Automated NLDC PSP Report Extractor** — Direct parsing and feature engineering from uploaded daily PSP reports (`.csv`, `.xls`, `.xlsx`).
- **Per-Prediction Anomaly Detection** — IsolationForest evaluation embedded across report tables and logs.
- **Graceful Fallback Mechanism** — Automatic fallback to 7-day rolling mean in case of ML model anomaly or service downtime.
- **Integrated PDF & CSV Export** — Comprehensive report generator with summary statistics, PSO generation mix, and per-unit savings.
- **Flexible Data Store** — Automatic MongoDB integration with seamless built-in in-memory fallback.

---

## 📋 Supported Indian States & UTs (33 Total)

```
Andhra Pradesh | Arunachal Pradesh | Assam | Bihar | Chandigarh
Chhattisgarh | DNH | Delhi | Goa | Gujarat | HP | Haryana
J&K | Jharkhand | Karnataka | Kerala | MP | Maharashtra
Manipur | Meghalaya | Mizoram | Nagaland | Odisha | Pondy
Punjab | Rajasthan | Sikkim | Tamil Nadu | Telangana | Tripura
UP | Uttarakhand | West Bengal
```

> **Note:** State names must match exact spelling and capitalization as listed above.

