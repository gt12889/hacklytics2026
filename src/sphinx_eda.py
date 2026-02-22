"""
Sphinx EDA — exploratory data analysis charts for FAERS data.

Generates Plotly figures from data/processed/faers_cleaned.parquet.
Backend logic only (no Streamlit dependency).
"""

import os
import sys
from itertools import combinations

import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config


# ── Helpers ──────────────────────────────────────────────────────────────────

def compute_severity(df: pd.DataFrame) -> pd.DataFrame:
    """Add ``severity_score`` column from seriousness flags.

    Mirrors ``document_builder._severity_score``:
    4 = death, 3 = life-threatening, 2 = hospitalization, 0 = other/unknown.
    """
    df = df.copy()
    df["severity_score"] = 0
    df.loc[df["seriousnesshospitalization"].astype(str) == "1", "severity_score"] = 2
    df.loc[df["seriousnesslifethreatening"].astype(str) == "1", "severity_score"] = 3
    df.loc[df["seriousnessdeath"].astype(str) == "1", "severity_score"] = 4
    return df


def _load_default_df() -> pd.DataFrame:
    """Load the cleaned FAERS parquet from the project data directory."""
    path = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "faers_cleaned.parquet")
    return pd.read_parquet(path)


# ── Chart 1: Drug interaction heatmap ────────────────────────────────────────

def drug_interaction_heatmap(df: pd.DataFrame) -> go.Figure:
    """Heatmap of drug co-occurrence coloured by mean severity.

    Explodes ``drugs`` so each report contributes all drug pairs, counts
    co-occurrences, and keeps the top-20 most-frequent drugs.
    """
    df = compute_severity(df)

    # Explode drugs — one row per (report_index, drug)
    exploded = df[["drugs", "severity_score"]].explode("drugs").dropna(subset=["drugs"])
    exploded["drugs"] = exploded["drugs"].str.lower().str.strip()

    # Keep only the top-20 most-frequent drugs
    top_drugs = exploded["drugs"].value_counts().head(20).index.tolist()
    exploded = exploded[exploded["drugs"].isin(top_drugs)]

    # Build pairs within each original report
    pairs = []
    for idx, grp in exploded.groupby(level=0):
        drug_list = grp["drugs"].unique().tolist()
        sev = grp["severity_score"].iloc[0]
        for a, b in combinations(sorted(drug_list), 2):
            pairs.append((a, b, sev))

    if not pairs:
        fig = go.Figure()
        fig.update_layout(title="Drug Interaction Heatmap (no data)")
        return fig

    pair_df = pd.DataFrame(pairs, columns=["drug_a", "drug_b", "severity"])
    agg = pair_df.groupby(["drug_a", "drug_b"]).agg(
        count=("severity", "size"),
        mean_severity=("severity", "mean"),
    ).reset_index()

    # Pivot into a matrix
    all_drugs = sorted(set(agg["drug_a"]) | set(agg["drug_b"]))
    matrix = pd.DataFrame(np.nan, index=all_drugs, columns=all_drugs)
    for _, row in agg.iterrows():
        matrix.loc[row["drug_a"], row["drug_b"]] = row["mean_severity"]
        matrix.loc[row["drug_b"], row["drug_a"]] = row["mean_severity"]

    fig = px.imshow(
        matrix.values.astype(float),
        x=matrix.columns.tolist(),
        y=matrix.index.tolist(),
        color_continuous_scale="YlOrRd",
        labels=dict(color="Mean Severity"),
        aspect="auto",
    )
    fig.update_layout(
        title="Drug Co-occurrence Heatmap (colour = mean severity)",
        xaxis_title="Drug",
        yaxis_title="Drug",
        width=900,
        height=800,
    )
    return fig


# ── Chart 2: Severity distribution for interaction pairs ────────────────────

def severity_distribution(df: pd.DataFrame) -> go.Figure:
    """Stacked horizontal bar of severity breakdown per interaction pair.

    Uses ``config.INTERACTION_PAIRS`` and shows the top 15 pairs by total count.
    """
    df = compute_severity(df)

    # Normalise drug lists to lowercase sets for matching
    drug_sets = df["drugs"].apply(
        lambda lst: set(d.lower().strip() for d in lst) if isinstance(lst, list) else set()
    )

    severity_labels = {4: "death", 3: "life-threatening", 2: "hospitalization", 0: "other"}
    records = []
    for a, b in config.INTERACTION_PAIRS:
        mask = drug_sets.apply(lambda s: a.lower() in s and b.lower() in s)
        subset = df.loc[mask]
        if subset.empty:
            continue
        counts = subset["severity_score"].map(severity_labels).value_counts()
        label = f"{a} + {b}"
        for sev_name in severity_labels.values():
            records.append({"pair": label, "severity": sev_name, "count": int(counts.get(sev_name, 0))})

    if not records:
        fig = go.Figure()
        fig.update_layout(title="Severity Distribution (no matching pairs)")
        return fig

    chart_df = pd.DataFrame(records)
    # Keep top 15 pairs by total count
    totals = chart_df.groupby("pair")["count"].sum().nlargest(15)
    chart_df = chart_df[chart_df["pair"].isin(totals.index)]
    # Sort pairs by total count
    pair_order = totals.sort_values().index.tolist()
    chart_df["pair"] = pd.Categorical(chart_df["pair"], categories=pair_order, ordered=True)

    color_map = {"death": "#d62728", "life-threatening": "#ff7f0e",
                 "hospitalization": "#1f77b4", "other": "#aec7e8"}

    fig = px.bar(
        chart_df,
        y="pair",
        x="count",
        color="severity",
        orientation="h",
        color_discrete_map=color_map,
        category_orders={"severity": ["death", "life-threatening", "hospitalization", "other"]},
    )
    fig.update_layout(
        title="Severity Distribution by Interaction Pair (top 15)",
        xaxis_title="Report Count",
        yaxis_title="",
        barmode="stack",
        height=600,
        width=900,
        legend_title="Severity",
    )
    return fig


# ── Chart 3: Demographic risk profile ───────────────────────────────────────

def demographic_risk_profile(df: pd.DataFrame) -> go.Figure:
    """Grouped bar: mean severity by age bucket and sex."""
    df = compute_severity(df)
    df = df.dropna(subset=["patient_age"]).copy()
    df = df[df["patient_sex"].isin(["male", "female"])]

    bins = [0, 30, 50, 65, 80, 200]
    labels = ["0-30", "31-50", "51-65", "66-80", "80+"]
    df["age_group"] = pd.cut(df["patient_age"], bins=bins, labels=labels, right=True)

    agg = df.groupby(["age_group", "patient_sex"], observed=True).agg(
        mean_severity=("severity_score", "mean"),
        count=("severity_score", "size"),
    ).reset_index()

    fig = px.bar(
        agg,
        x="age_group",
        y="mean_severity",
        color="patient_sex",
        barmode="group",
        text="count",
        color_discrete_map={"male": "#1f77b4", "female": "#e377c2"},
        category_orders={"age_group": labels},
    )
    fig.update_layout(
        title="Demographic Risk Profile (mean severity by age & sex)",
        xaxis_title="Age Group",
        yaxis_title="Mean Severity Score",
        legend_title="Sex",
        width=800,
        height=500,
    )
    fig.update_traces(textposition="outside", texttemplate="%{text:,}")
    return fig


# ── Chart 4: Top reactions ──────────────────────────────────────────────────

def top_reactions(df: pd.DataFrame) -> go.Figure:
    """Horizontal bar of the 20 most-frequent MedDRA reaction terms."""
    exploded = df[["reactions"]].explode("reactions").dropna(subset=["reactions"])
    exploded["reactions"] = exploded["reactions"].str.lower().str.strip()
    counts = exploded["reactions"].value_counts().head(20).sort_values()

    fig = px.bar(
        x=counts.values,
        y=counts.index,
        orientation="h",
        labels={"x": "Report Count", "y": "Reaction"},
    )
    fig.update_layout(
        title="Top 20 Adverse Reactions",
        height=600,
        width=800,
    )
    return fig


# ── Summary stats ───────────────────────────────────────────────────────────

def dataset_summary(df: pd.DataFrame) -> dict:
    """Return a dict of high-level dataset statistics."""
    df = compute_severity(df)

    # Unique drugs / reactions (exploded)
    all_drugs = df["drugs"].explode().dropna().str.lower().str.strip().unique()
    all_reactions = df["reactions"].explode().dropna().str.lower().str.strip().unique()

    sex_dist = df["patient_sex"].value_counts().to_dict()
    ages = df["patient_age"].dropna()

    sev_map = {4: "death", 3: "life_threatening", 2: "hospitalization", 0: "other"}
    sev_counts = df["severity_score"].map(sev_map).value_counts().to_dict()

    return {
        "total_reports": len(df),
        "unique_drugs": len(all_drugs),
        "unique_reactions": len(all_reactions),
        "sex_distribution": {
            "male": int(sex_dist.get("male", 0)),
            "female": int(sex_dist.get("female", 0)),
            "unknown": int(sex_dist.get("unknown", 0)),
        },
        "age_stats": {
            "mean": round(float(ages.mean()), 1) if len(ages) else None,
            "median": round(float(ages.median()), 1) if len(ages) else None,
            "min": round(float(ages.min()), 1) if len(ages) else None,
            "max": round(float(ages.max()), 1) if len(ages) else None,
        },
        "severity_counts": {
            "death": sev_counts.get("death", 0),
            "life_threatening": sev_counts.get("life_threatening", 0),
            "hospitalization": sev_counts.get("hospitalization", 0),
            "other": sev_counts.get("other", 0),
        },
    }
