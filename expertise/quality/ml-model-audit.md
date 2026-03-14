# ML Model Audit — Expertise Module

> An ML model auditor validates correctness, fairness, calibration, and production readiness of machine learning models before and after deployment. The scope spans data quality verification, discrimination and calibration testing, fairness assessment against legal thresholds, interpretability analysis via SHAP, drift detection, and continuous production monitoring.

---

## Why Model Auditing Matters

| Incident | Year | Impact | Root Cause |
|---|---|---|---|
| Knight Capital algorithmic trading | 2012 | $440M loss in 45 minutes | Untested deployment; no rollback, no production monitoring |
| Amazon hiring tool gender bias | 2018 | Scrapped after Reuters exposure | Training data reflected historical hiring bias against women |
| Zillow Zestimate iBuyer model | 2021 | $569M write-down, 2,000 layoffs | Model drift; no recalibration when market shifted |
| COMPAS recidivism scoring | 2016 | ProPublica investigation, litigation | Racial bias in FPR; Black defendants 2x more likely flagged high-risk |

Pattern: models passed aggregate metrics but failed on unmeasured dimensions — subgroup fairness, calibration under shift, or operational monitoring.

**Key references:** Google Model Cards paper (Mitchell et al., 2019) — standard for model documentation. EU AI Act (Regulation 2024/1689) — four risk tiers, high-risk systems require conformity assessments, penalties up to 7% global turnover. NIST AI RMF 1.0 (2023) — Govern, Map, Measure, Manage. US EEOC Uniform Guidelines — 4/5ths rule for adverse impact.

---

## 10-Domain Audit Framework

| # | Domain | What to Check | Key Metric | Threshold |
|---|---|---|---|---|
| 1 | Documentation | Model cards, data provenance, version history | Completeness | 100% required fields |
| 2 | Data Quality | Distribution, missing values, leakage, duplicates | PSI, missing rate | PSI < 0.1, missing < 5% |
| 3 | Feature Analysis | Importance stability, multicollinearity | SHAP values, VIF | VIF < 5, stable SHAP |
| 4 | Target/Label | Class balance, label noise, label leakage | Imbalance ratio | < 10:1, noise < 2% |
| 5 | Calibration | Predicted probability vs. observed frequency | Hosmer-Lemeshow, Brier | HL p > 0.05, Brier < 0.25 |
| 6 | Discrimination | Separating power for positive/negative classes | AUC-ROC, Gini, KS | AUC > 0.7, KS > 0.3 |
| 7 | Fairness | Protected group parity in outcomes and errors | Disparate impact | > 0.8 (4/5ths rule) |
| 8 | Interpretability | Feature explanations, local and global | SHAP consistency | Stable across samples |
| 9 | Monitoring | Drift detection, performance degradation | PSI per feature | PSI < 0.2, AUC drop < 5% |
| 10 | Business Impact | Decision quality, cost-weighted outcomes | Cost matrix | ROI positive |

**Execution order:** Documentation -> Data Quality -> Feature Analysis -> Target/Label -> Discrimination -> Calibration -> Fairness -> Interpretability -> Monitoring -> Business Impact. Each domain's findings inform the next — data quality issues invalidate downstream metrics, miscalibration corrupts fairness results.

---

## Domain 1: Documentation — Model Cards

```markdown
# Model Card: [Model Name]
## Model Details
- Version, Type, Framework, Training date, Owner
## Intended Use
- Primary use case, Out-of-scope uses, Target population
## Training Data
- Source, Collection period, Size, Preprocessing, Known limitations
## Evaluation Results
| Metric | Train | Validation | Test | Production |
|---|---|---|---|---|
| AUC-ROC / Gini / KS / Brier / PR-AUC | | | | |
## Performance by Subgroup
| Subgroup | N | AUC | FPR | FNR | Disparate Impact |
## Ethical Considerations
- Protected attributes evaluated, Fairness metrics, Known biases, Mitigation
## Limitations & Monitoring
- Drift detection method, Retraining trigger, Rollback plan
```

```python
REQUIRED_SECTIONS = [
    'model_details', 'intended_use', 'training_data',
    'evaluation_results', 'performance_by_subgroup',
    'ethical_considerations', 'limitations', 'monitoring',
]
REQUIRED_FIELDS = {
    'model_details': ['version', 'type', 'framework', 'training_date', 'owner'],
    'intended_use': ['primary_use', 'out_of_scope', 'target_population'],
    'training_data': ['source', 'collection_period', 'size', 'preprocessing'],
    'evaluation_results': ['auc_roc', 'gini', 'brier_score'],
    'ethical_considerations': ['protected_attributes', 'fairness_metrics'],
    'monitoring': ['drift_detection', 'retraining_trigger', 'rollback_plan'],
}

def validate_model_card(card: dict) -> dict:
    missing_sections = [s for s in REQUIRED_SECTIONS if s not in card]
    missing_fields = {}
    for section, fields in REQUIRED_FIELDS.items():
        if section in card:
            missing = [f for f in fields if not card[section].get(f)]
            if missing:
                missing_fields[section] = missing
    total = len(REQUIRED_SECTIONS) + sum(len(v) for v in REQUIRED_FIELDS.values())
    total_missing = len(missing_sections) + sum(len(v) for v in missing_fields.values())
    completeness = (total - total_missing) / total
    return {'completeness': round(completeness, 3), 'passes': completeness == 1.0,
            'missing_sections': missing_sections, 'missing_fields': missing_fields}
```

---

## Domain 2: Data Quality — PSI and Integrity

### Population Stability Index (PSI)

| PSI Value | Interpretation | Action |
|---|---|---|
| < 0.1 | No significant shift | Continue monitoring |
| 0.1 - 0.2 | Moderate shift | Investigate, consider recalibration |
| > 0.2 | Significant shift | Retrain model |
| > 0.25 | Severe shift | Immediate review, potential rollback |

```python
import numpy as np
from typing import Optional

def compute_psi(
    expected: np.ndarray, actual: np.ndarray,
    bins: int = 10, method: str = 'quantile',
) -> float:
    """Population Stability Index — measures distributional shift."""
    expected = expected[~np.isnan(expected)]
    actual = actual[~np.isnan(actual)]
    if len(expected) == 0 or len(actual) == 0:
        raise ValueError("Input arrays must contain non-NaN values.")

    if method == 'quantile':
        breakpoints = np.unique(np.quantile(expected, np.linspace(0, 1, bins + 1)))
    elif method == 'uniform':
        breakpoints = np.linspace(expected.min(), expected.max(), bins + 1)
    else:
        raise ValueError(f"Unknown method '{method}'. Use 'quantile' or 'uniform'.")

    if len(breakpoints) < 3:  # Collapsed bins — fall back to uniform
        breakpoints = np.linspace(expected.min(), expected.max(), bins + 1)

    expected_pct = np.clip(np.histogram(expected, bins=breakpoints)[0] / len(expected), 1e-4, None)
    actual_pct = np.clip(np.histogram(actual, bins=breakpoints)[0] / len(actual), 1e-4, None)
    return float(np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct)))

def compute_feature_psi(expected_df, actual_df, columns=None, bins=10) -> dict:
    """PSI for every numeric feature. Returns {feature: psi} sorted descending."""
    if columns is None:
        columns = expected_df.select_dtypes(include=[np.number]).columns.tolist()
    results = {}
    for col in columns:
        try:
            results[col] = compute_psi(expected_df[col].values, actual_df[col].values, bins)
        except ValueError:
            results[col] = float('nan')
    return dict(sorted(results.items(), key=lambda x: x[1], reverse=True))
```

### Data Quality Report

```python
import pandas as pd

def data_quality_report(df: pd.DataFrame) -> dict:
    """Checks missing values, duplicates, constant columns, infinities, high cardinality."""
    n_rows = len(df)
    missing_pct = (df.isnull().sum() / n_rows * 100).round(2)
    n_dupes = int(df.duplicated().sum())
    constant_cols = [c for c in df.columns if df[c].nunique(dropna=True) <= 1]
    numeric = df.select_dtypes(include=[np.number]).columns
    inf_counts = {c: int(np.isinf(df[c]).sum()) for c in numeric if np.isinf(df[c]).any()}
    cat_cols = df.select_dtypes(include=['object', 'category']).columns
    high_card = {c: int(df[c].nunique()) for c in cat_cols if df[c].nunique() > 0.5 * n_rows}
    return {
        'shape': df.shape, 'duplicate_rows': n_dupes,
        'columns_above_5pct_missing': [c for c, p in missing_pct.items() if p > 5],
        'constant_columns': constant_cols, 'infinite_values': inf_counts,
        'high_cardinality_categoricals': high_card,
    }
```

---

## Domain 3: Feature Analysis — SHAP and Multicollinearity

### SHAP Audit

```python
import shap
import matplotlib.pyplot as plt
from pathlib import Path

def run_shap_audit(model, X_test, output_dir: str = 'audit/shap') -> dict:
    """Global SHAP importance, summary plot, top-5 dependence plots."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    tree_types = {'XGBClassifier', 'LGBMClassifier', 'RandomForestClassifier',
                  'GradientBoostingClassifier', 'XGBRegressor', 'LGBMRegressor'}
    if type(model).__name__ in tree_types:
        explainer = shap.TreeExplainer(model)
    else:
        background = shap.sample(X_test, min(100, len(X_test)))
        explainer = shap.KernelExplainer(model.predict_proba, background)

    shap_values = explainer.shap_values(X_test)
    if isinstance(shap_values, list) and len(shap_values) == 2:
        shap_values = shap_values[1]  # Positive class for binary

    mean_abs = np.abs(shap_values).mean(axis=0)
    names = X_test.columns.tolist() if hasattr(X_test, 'columns') else [f'f_{i}' for i in range(X_test.shape[1])]
    importance = dict(sorted(zip(names, mean_abs), key=lambda x: x[1], reverse=True))

    shap.summary_plot(shap_values, X_test, show=False)
    plt.savefig(f'{output_dir}/shap_summary.png', dpi=150, bbox_inches='tight'); plt.close()

    for feat in list(importance.keys())[:5]:
        shap.dependence_plot(feat, shap_values, X_test, show=False)
        plt.savefig(f'{output_dir}/dep_{feat}.png', dpi=150, bbox_inches='tight'); plt.close()

    return {'feature_importance': importance, 'top_5': list(importance.keys())[:5]}

def shap_consistency_check(model, X_test, n_bootstrap: int = 5, sample_frac: float = 0.8) -> dict:
    """Verify SHAP rankings are stable across bootstrap samples."""
    from collections import Counter
    rankings = []
    for i in range(n_bootstrap):
        sample = X_test.sample(frac=sample_frac, random_state=i)
        explainer = shap.TreeExplainer(model)
        sv = explainer.shap_values(sample)
        if isinstance(sv, list) and len(sv) == 2:
            sv = sv[1]
        ranked = np.argsort(-np.abs(sv).mean(axis=0)).tolist()[:5]
        rankings.append(ranked)
    all_top5 = [f for r in rankings for f in r]
    stable = [f for f, c in Counter(all_top5).items() if c == n_bootstrap]
    return {'stable_top5': stable, 'stability_ratio': len(stable) / 5, 'passes': len(stable) >= 3}
```

### Variance Inflation Factor (VIF)

```python
def compute_vif(X: pd.DataFrame) -> pd.DataFrame:
    """VIF per feature. VIF > 5 = moderate, > 10 = severe multicollinearity."""
    X_arr = X.values.astype(float)
    vif_data = []
    for i in range(X_arr.shape[1]):
        y_i = X_arr[:, i]
        X_i = np.column_stack([np.ones(X_arr.shape[0]), np.delete(X_arr, i, axis=1)])
        try:
            beta = np.linalg.lstsq(X_i, y_i, rcond=None)[0]
            ss_res = np.sum((y_i - X_i @ beta) ** 2)
            ss_tot = np.sum((y_i - y_i.mean()) ** 2)
            r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
            vif = 1 / (1 - r2) if r2 < 1.0 else float('inf')
        except np.linalg.LinAlgError:
            vif = float('inf')
        vif_data.append({'feature': X.columns[i], 'vif': round(vif, 2),
                         'flag': 'SEVERE' if vif > 10 else ('MODERATE' if vif > 5 else 'OK')})
    return pd.DataFrame(vif_data).sort_values('vif', ascending=False)
```

---

## Domain 4: Target/Label Quality

```python
from collections import Counter

def label_quality_report(y: np.ndarray) -> dict:
    """Assess class balance and recommend resampling strategy."""
    counts = Counter(y)
    total = len(y)
    majority = max(counts, key=counts.get)
    minority = min(counts, key=counts.get)
    ratio = counts[majority] / counts[minority]
    if ratio < 3: strategy, severity = 'none', 'balanced'
    elif ratio < 10: strategy, severity = 'class_weight', 'moderate'
    elif ratio < 100: strategy, severity = 'SMOTE_or_class_weight', 'severe'
    else: strategy, severity = 'anomaly_detection_reframe', 'extreme'
    return {
        'class_distribution': dict(counts), 'imbalance_ratio': round(ratio, 1),
        'severity': severity, 'recommended_strategy': strategy, 'passes': ratio < 10,
    }
```

---

## Domain 5: Calibration Testing

### Hosmer-Lemeshow Test

```python
from scipy.stats import chi2

def hosmer_lemeshow_test(y_true: np.ndarray, y_prob: np.ndarray, n_groups: int = 10) -> dict:
    """Goodness-of-fit test. H0: model is well-calibrated. Reject if p < 0.05."""
    order = np.argsort(y_prob)
    y_true_s, y_prob_s = np.asarray(y_true, dtype=float)[order], np.asarray(y_prob, dtype=float)[order]
    groups = np.array_split(np.arange(len(y_true)), n_groups)
    hl_stat = 0.0
    group_details = []
    for idx in groups:
        n_g = len(idx)
        obs = y_true_s[idx].sum()
        exp = y_prob_s[idx].sum()
        if exp > 0: hl_stat += (obs - exp) ** 2 / exp
        if (n_g - exp) > 0: hl_stat += (n_g - obs - (n_g - exp)) ** 2 / (n_g - exp)
        group_details.append({'n': n_g, 'observed_rate': round(float(obs / n_g), 4),
                              'predicted_rate': round(float(y_prob_s[idx].mean()), 4)})
    p_value = 1 - chi2.cdf(hl_stat, n_groups - 2)
    return {
        'statistic': round(hl_stat, 4), 'p_value': round(p_value, 4),
        'group_details': group_details, 'passes': p_value > 0.05,
        'interpretation': 'Well calibrated' if p_value > 0.05
            else 'Miscalibrated — consider Platt scaling or isotonic regression',
    }
```

### Calibration Curve and Brier Score

```python
from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss

def calibration_audit(y_true, y_prob, n_bins=10, output_dir='audit/calibration') -> dict:
    """Brier score + reliability curve plot. Brier < 0.25 = acceptable."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    brier = brier_score_loss(y_true, y_prob)
    frac_pos, mean_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy='uniform')

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    ax1.plot([0, 1], [0, 1], 'k--', label='Perfect')
    ax1.plot(mean_pred, frac_pos, 'o-', label=f'Model (Brier={brier:.4f})')
    ax1.set_xlabel('Mean predicted'); ax1.set_ylabel('Fraction positive')
    ax1.set_title('Calibration Curve'); ax1.legend()
    ax2.hist(y_prob, bins=50, alpha=0.7); ax2.set_title('Prediction Distribution')
    plt.tight_layout()
    plt.savefig(f'{output_dir}/calibration_plot.png', dpi=150, bbox_inches='tight'); plt.close()

    return {'brier_score': round(brier, 4), 'passes': brier < 0.25,
            'calibration_bins': {'predicted': mean_pred.tolist(), 'observed': frac_pos.tolist()}}
```

---

## Domain 6: Discrimination Metrics

```python
from sklearn.metrics import roc_auc_score, average_precision_score, roc_curve
from scipy.stats import ks_2samp

def discrimination_report(y_true: np.ndarray, y_prob: np.ndarray) -> dict:
    """AUC-ROC, Gini, KS statistic, PR-AUC with grading."""
    auc = roc_auc_score(y_true, y_prob)
    gini = 2 * auc - 1
    ks_stat = ks_2samp(y_prob[y_true == 1], y_prob[y_true == 0]).statistic
    fpr, tpr, thresholds = roc_curve(y_true, y_prob)
    optimal_threshold = float(thresholds[np.argmax(tpr - fpr)])
    pr_auc = average_precision_score(y_true, y_prob)
    if auc >= 0.9: grade = 'EXCELLENT'
    elif auc >= 0.8: grade = 'GOOD'
    elif auc >= 0.7: grade = 'ACCEPTABLE'
    elif auc >= 0.6: grade = 'POOR'
    else: grade = 'FAIL'
    return {'AUC-ROC': round(auc, 4), 'Gini': round(gini, 4), 'KS': round(ks_stat, 4),
            'KS_optimal_threshold': round(optimal_threshold, 4), 'PR-AUC': round(pr_auc, 4),
            'grade': grade, 'passes': auc > 0.7}
```

---

## Domain 7: Fairness Assessment

**Legal context:** US EEOC 4/5ths rule — selection rate for protected group must be >= 80% of highest-rate group. EU AI Act Article 10 — high-risk systems must use representative training data, examine biases. ECOA/Reg B — prohibits discrimination in credit by race, sex, age, etc.

### Disparate Impact and Equalized Odds

```python
def disparate_impact_ratio(y_pred: np.ndarray, protected_attr: np.ndarray) -> dict:
    """4/5ths rule: ratio >= 0.8 for all groups."""
    groups = np.unique(protected_attr)
    rates = {str(g): float(y_pred[protected_attr == g].mean()) for g in groups}
    max_rate = max(rates.values())
    results = {}
    for g, rate in rates.items():
        ratio = rate / max_rate if max_rate > 0 else 0.0
        results[g] = {'rate': round(rate, 4), 'ratio': round(ratio, 4), 'passes': ratio >= 0.8}
    return {'group_results': results, 'overall_passes': all(r['passes'] for r in results.values())}

def equalized_odds_check(y_true, y_pred, protected_attr, threshold=0.05) -> dict:
    """FPR and TPR should be similar across groups (within threshold)."""
    groups = np.unique(protected_attr)
    metrics = {}
    for g in groups:
        mask = protected_attr == g
        yt, yp = y_true[mask], y_pred[mask]
        tp = ((yt == 1) & (yp == 1)).sum(); fn = ((yt == 1) & (yp == 0)).sum()
        fp = ((yt == 0) & (yp == 1)).sum(); tn = ((yt == 0) & (yp == 0)).sum()
        tpr = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        metrics[str(g)] = {'TPR': round(tpr, 4), 'FPR': round(fpr, 4)}
    tpr_gap = max(m['TPR'] for m in metrics.values()) - min(m['TPR'] for m in metrics.values())
    fpr_gap = max(m['FPR'] for m in metrics.values()) - min(m['FPR'] for m in metrics.values())
    return {'group_metrics': metrics, 'TPR_gap': round(tpr_gap, 4), 'FPR_gap': round(fpr_gap, 4),
            'passes_equalized_odds': tpr_gap <= threshold and fpr_gap <= threshold}
```

---

## Domain 8: Interpretability

**EU AI Act risk-level requirements:**

| Risk Level | Examples | Required Interpretability |
|---|---|---|
| Unacceptable | Social scoring, real-time biometric | Prohibited |
| High | Credit, hiring, criminal justice | Full SHAP/LIME, per-prediction explanations, human-in-the-loop |
| Limited | Chatbots, recommendations | Transparency obligations |
| Minimal | Spam filters, game AI | Best practice only |

### Local Explanation Stability

```python
from scipy.stats import spearmanr

def explanation_stability_test(explainer, instance, n_perturbations=20, noise_scale=0.01) -> dict:
    """Test if local explanations are stable under small input perturbations."""
    base = explainer.shap_values(instance.reshape(1, -1))
    if isinstance(base, list): base = base[1]
    base = base.flatten()
    correlations = []
    for i in range(n_perturbations):
        noise = np.random.RandomState(i).normal(0, noise_scale, size=instance.shape)
        sv = explainer.shap_values((instance + noise).reshape(1, -1))
        if isinstance(sv, list): sv = sv[1]
        corr, _ = spearmanr(base, sv.flatten())
        correlations.append(corr)
    mean_corr = float(np.mean(correlations))
    return {'mean_rank_correlation': round(mean_corr, 4),
            'min_rank_correlation': round(float(np.min(correlations)), 4),
            'passes': mean_corr > 0.8 and min(correlations) > 0.5}
```

---

## Domain 9: Production Monitoring Pipeline

```
              Alerting Layer
    ┌─────────────────────────────────┐
    │  PSI > 0.2 → PagerDuty          │
    │  AUC drop > 5% → Slack          │
    │  Label drift → Email             │
    └──────────┬──────────────────────┘
               │
    ┌──────────▼──────────────────────┐
    │    Drift Detection Engine        │
    │  Feature PSI | Prediction shift  │
    │  Label drift | Rolling AUC       │
    └──────────┬──────────────────────┘
               │
    ┌──────────▼──────────────────────┐
    │      Scoring Pipeline            │
    │  Data → Features → Model → Score │
    │  (log each stage for monitoring) │
    └─────────────────────────────────┘
```

**Alerting thresholds:**

| Metric | Yellow (Investigate) | Red (Action Required) |
|---|---|---|
| Feature PSI (any feature) | > 0.1 | > 0.2 |
| Prediction PSI | > 0.1 | > 0.2 |
| Rolling AUC (7-day) | < baseline - 3% | < baseline - 5% |
| Missing value rate | > 2x training rate | > 5x training rate |
| Prediction volume | < 50% normal | < 20% normal |

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class MonitoringResult:
    metric_name: str
    current_value: float
    threshold_yellow: float
    threshold_red: float
    status: str  # GREEN, YELLOW, RED
    details: Optional[str] = None

class ModelMonitor:
    """Production monitoring: feature drift, prediction drift, performance degradation."""
    def __init__(self, reference_features, reference_predictions, feature_names, baseline_auc):
        self.ref_features = reference_features
        self.ref_predictions = reference_predictions
        self.feature_names = feature_names
        self.baseline_auc = baseline_auc

    def check_feature_drift(self, current_features) -> list:
        results = []
        for i, name in enumerate(self.feature_names):
            psi = compute_psi(self.ref_features[:, i], current_features[:, i])
            status = 'RED' if psi > 0.2 else ('YELLOW' if psi > 0.1 else 'GREEN')
            results.append(MonitoringResult(f'psi_{name}', round(psi, 4), 0.1, 0.2, status))
        return results

    def check_prediction_drift(self, current_predictions) -> MonitoringResult:
        psi = compute_psi(self.ref_predictions, current_predictions)
        status = 'RED' if psi > 0.2 else ('YELLOW' if psi > 0.1 else 'GREEN')
        return MonitoringResult('prediction_psi', round(psi, 4), 0.1, 0.2, status)

    def check_performance(self, y_true, y_prob) -> MonitoringResult:
        current_auc = roc_auc_score(y_true, y_prob)
        drop = self.baseline_auc - current_auc
        status = 'RED' if drop > 0.05 else ('YELLOW' if drop > 0.03 else 'GREEN')
        return MonitoringResult('rolling_auc', round(current_auc, 4),
                                round(self.baseline_auc - 0.03, 4),
                                round(self.baseline_auc - 0.05, 4), status,
                                f'drop={drop:.4f}')

    def run_full_check(self, current_features, current_predictions,
                       y_true=None, y_prob=None) -> dict:
        results = self.check_feature_drift(current_features)
        results.append(self.check_prediction_drift(current_predictions))
        if y_true is not None and y_prob is not None:
            results.append(self.check_performance(y_true, y_prob))
        statuses = [r.status for r in results]
        overall = 'RED' if 'RED' in statuses else ('YELLOW' if 'YELLOW' in statuses else 'GREEN')
        return {
            'overall_status': overall, 'n_checks': len(results),
            'red_alerts': [{'metric': r.metric_name, 'value': r.current_value}
                           for r in results if r.status == 'RED'],
            'yellow_alerts': [{'metric': r.metric_name, 'value': r.current_value}
                              for r in results if r.status == 'YELLOW'],
        }
```

---

## Domain 10: Business Impact

```python
def cost_matrix_evaluation(y_true, y_pred, cost_tp=0.0, cost_fp=-100.0,
                           cost_fn=-500.0, cost_tn=0.0) -> dict:
    """Evaluate model using business cost matrix. Defaults: fraud detection scenario."""
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    tp = int(((y_true == 1) & (y_pred == 1)).sum())
    fp = int(((y_true == 0) & (y_pred == 1)).sum())
    fn = int(((y_true == 1) & (y_pred == 0)).sum())
    tn = int(((y_true == 0) & (y_pred == 0)).sum())
    total_cost = tp * cost_tp + fp * cost_fp + fn * cost_fn + tn * cost_tn
    baseline = y_true.sum() * cost_fn + (len(y_true) - y_true.sum()) * cost_tn
    net_benefit = total_cost - baseline
    return {'confusion_matrix': {'TP': tp, 'FP': fp, 'FN': fn, 'TN': tn},
            'total_cost': round(total_cost, 2), 'baseline_no_model': round(baseline, 2),
            'net_benefit': round(net_benefit, 2), 'roi_positive': net_benefit > 0}
```

---

## Anti-Patterns

### 1. Training on test data (data leakage)
Features include information unavailable at prediction time. Model appears brilliant in eval, fails in production. **Detect:** suspiciously high single-feature importance; future data in features; scaler fit before train/test split.

### 2. Optimizing aggregate metrics only
Overall AUC 0.85, minority subgroup AUC 0.55. Aggregate masks subgroup failure. **Prevent:** always stratify metrics by protected attributes, geography, business segments (Domain 7).

### 3. Deploy and forget
Model degrades silently as distributions shift. Zillow's $569M write-down is the canonical example. **Prevent:** implement monitoring pipeline (Domain 9). No model ships without drift detection.

### 4. Fairness washing
Computing disparate impact to check a box, taking no action when ratios fall below 0.8. **Prevent:** fairness metrics must have automated deployment gates, same as failing tests.

### 5. Overfitting to validation set
After 200 hyperparameter tuning rounds against the validation set, the model memorizes it. **Prevent:** holdout test evaluated once at the end; use cross-validation for hyperparameter search.

### 6. Ignoring class imbalance
Predicting "not fraud" for every transaction yields 99.5% accuracy on 0.5% fraud data. **Prevent:** if imbalance > 10:1, accuracy is invalid. Use PR-AUC, F1, or cost-weighted metrics.

### 7. Single metric obsession
AUC 0.92 but predicted 0.7 corresponds to 30% actual event rate. Every threshold decision is wrong. **Prevent:** always audit calibration (Domain 5) alongside discrimination (Domain 6).

### 8. Missing data provenance
Cannot reproduce training dataset six months later for a regulator. **Prevent:** version training data alongside model artifacts. Record query, filters, date range, random seed.

### 9. Uncalibrated probability usage
Random forest `predict_proba` treated as true probability for risk tiers. RF outputs are vote fractions, not probabilities. **Prevent:** calibrate with Platt scaling or isotonic regression; test with Hosmer-Lemeshow.

### 10. Threshold selection on training data
Operating threshold optimized on training set; production distribution differs. **Prevent:** select thresholds on validation set using business cost matrix; re-evaluate periodically.

---

## Recalibration Strategies

When calibration fails (Hosmer-Lemeshow p < 0.05 or Brier > 0.25), apply one of these post-hoc methods:

| Method | When to Use | Pros | Cons |
|---|---|---|---|
| Platt Scaling | Binary classification, sigmoid-shaped miscalibration | Simple, works well for SVMs and neural nets | Assumes sigmoid relationship |
| Isotonic Regression | Non-parametric miscalibration | No shape assumption, flexible | Requires more data, can overfit on small sets |
| Beta Calibration | Skewed prediction distributions | Handles asymmetric miscalibration | More complex, less widely supported |
| Temperature Scaling | Neural network confidence calibration | Single parameter, preserves ranking | Only adjusts sharpness, not shape |

Always recalibrate on a held-out calibration set (not training or test). Re-run Hosmer-Lemeshow after recalibration to confirm improvement.

---

## Deployment Audit Checklist

| # | Check | Pass Criteria |
|---|---|---|
| 1 | Model card complete | All required sections filled |
| 2 | Data quality | No columns > 5% missing, no leakage |
| 3 | Feature VIF | < 5 for all features (or justified) |
| 4 | Class imbalance | < 10:1 (or mitigation documented) |
| 5 | Calibration | Hosmer-Lemeshow p > 0.05 |
| 6 | Discrimination | AUC-ROC > 0.7 on holdout |
| 7 | Fairness | Disparate impact > 0.8 all groups |
| 8 | SHAP stability | Rankings stable across bootstrap |
| 9 | Monitoring | Pipeline deployed with PSI alerts |
| 10 | Business impact | Cost matrix shows positive ROI |
| 11 | Data versioning | Training data reproducible |
| 12 | Rollback plan | Documented and tested |
