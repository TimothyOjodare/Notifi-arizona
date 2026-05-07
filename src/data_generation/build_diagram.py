"""
Generate the architecture diagram. Single image, single bidirectional flow.
"""

import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent.parent / "docs"

CARDINAL = "#AB0520"
NAVY = "#0C234B"
CREAM = "#F5F1E8"
SAGE = "#3F6B47"
AMBER = "#B8842B"
TERRA = "#B85C3F"
INK1 = "#1A1A1A"
INK3 = "#6B6F75"

fig, ax = plt.subplots(figsize=(16, 10))
fig.patch.set_facecolor(CREAM)
ax.set_facecolor(CREAM)
ax.set_xlim(0, 16)
ax.set_ylim(0, 11)
ax.axis("off")


def box(x, y, w, h, label, sublabel="", color=NAVY, text_color="white",
        title_size=11, sub_size=8.5, font="serif"):
    rect = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.05,rounding_size=0.08",
                           facecolor=color, edgecolor=color, linewidth=1.5)
    ax.add_patch(rect)
    if sublabel:
        ax.text(x + w/2, y + h*0.62, label, ha="center", va="center",
                color=text_color, fontsize=title_size, fontweight="bold", family=font)
        ax.text(x + w/2, y + h*0.32, sublabel, ha="center", va="center",
                color=text_color, fontsize=sub_size, family="sans-serif", alpha=0.9)
    else:
        ax.text(x + w/2, y + h/2, label, ha="center", va="center",
                color=text_color, fontsize=title_size, fontweight="bold", family=font)


def arrow(x1, y1, x2, y2, color=NAVY, lw=1.4, label="", label_offset=(0, 0.18),
          connectionstyle="arc3,rad=0", style="->,head_width=0.18,head_length=0.22"):
    a = FancyArrowPatch((x1, y1), (x2, y2),
                         arrowstyle=style, color=color, lw=lw,
                         connectionstyle=connectionstyle, mutation_scale=14)
    ax.add_patch(a)
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mx + label_offset[0], my + label_offset[1], label,
                ha="center", va="center", color=color,
                fontsize=8.5, fontweight="bold", family="sans-serif",
                bbox=dict(boxstyle="round,pad=0.3", facecolor=CREAM, edgecolor="none"))


# ===== Title =====
ax.text(8, 10.4, "NotifiAZ", ha="center", va="center",
        color=NAVY, fontsize=24, fontweight="bold", family="serif")
ax.text(8, 9.85, "Reportable disease reporting · 4 minutes · multi-agency · bidirectional",
        ha="center", va="center", color=INK3, fontsize=11, family="serif", style="italic")

# ===== Source: Clinical EHR =====
box(0.4, 6.8, 3.0, 1.5, "Clinical EHR", "Epic / Cerner / Athena / standalone",
    color=NAVY, title_size=13)
ax.text(1.9, 6.55, "FHIR R4 Bundle", ha="center", va="top",
        color=INK3, fontsize=9, family="sans-serif", style="italic")

# ===== Source: Veterinary EHR (cross-species) =====
box(0.4, 4.5, 3.0, 1.3, "Veterinary EHR", "(zoonotic disease)",
    color=TERRA, title_size=13)

# ===== Reporter (the central engine) =====
box(5.5, 5.2, 4.5, 3.0, "", "", color=CARDINAL, title_size=20)
ax.text(7.75, 7.7, "NotifiAZ Reporter", ha="center", va="center",
        color="white", fontsize=18, fontweight="bold", family="serif")
ax.text(7.75, 7.30, "Routing engine + message generator", ha="center", va="center",
        color="white", fontsize=10, family="serif", style="italic", alpha=0.85)

# Inside-reporter bullets
ax.text(7.75, 6.7, "● 72-disease reportable database",
        ha="center", va="center", color="white", fontsize=9.5, family="sans-serif")
ax.text(7.75, 6.4, "● Per-disease destination router",
        ha="center", va="center", color="white", fontsize=9.5, family="sans-serif")
ax.text(7.75, 6.1, "● 9 agency-format generators",
        ha="center", va="center", color="white", fontsize=9.5, family="sans-serif")
ax.text(7.75, 5.8, "● Pre-submit validation",
        ha="center", va="center", color="white", fontsize=9.5, family="sans-serif")

# Arrow EHR -> Reporter
arrow(3.45, 7.5, 5.5, 7.0, color=NAVY, label="POST /api/reports", lw=2.2)

# Arrow Vet EHR -> Reporter (cross-species path)
arrow(3.45, 5.0, 5.5, 6.0, color=TERRA, lw=1.8,
      connectionstyle="arc3,rad=0.05")
ax.text(4.1, 5.2, "↔ ADHS\ncross-species\nbridge",
        ha="center", va="center", color=TERRA,
        fontsize=8, fontweight="bold", family="sans-serif", style="italic",
        bbox=dict(boxstyle="round,pad=0.25", facecolor=CREAM, edgecolor="none"))

# ===== Destinations (right side) =====
dest_w = 3.0
dest_h = 0.70

destinations = [
    ("ADHS",                   "HL7 v2.5.1 ELR",            CARDINAL, "human"),
    ("CDC NNDSS",              "NNDSS Modernization v2",    CARDINAL, "human"),
    ("Pima County PH",         "Pima Local JSON",           CARDINAL, "human"),
    ("Maricopa County PH",     "MCDPH Reportable v1.0",     CARDINAL, "human"),
    ("Tribal Health Auth.",    "Tribal Referral (sovereign)", AMBER,   "tribal"),
    ("USDA APHIS",             "VSPS Form 1-A",             SAGE,     "animal"),
    ("AZ Dept of Agriculture", "AZ State Vet v1.5",         SAGE,     "animal"),
    ("AZ Game and Fish",       "AZGFD Wildlife v1.0",       SAGE,     "animal"),
]

y_top = 9.3
gap = 0.18
for i, (name, fmt, c, kind) in enumerate(destinations):
    yy = y_top - i * (dest_h + gap)
    box(11.8, yy - dest_h, dest_w, dest_h, name, fmt, color=c, title_size=10, sub_size=7.5)

# Header for destinations stack
ax.text(13.3, 9.65, "8 destinations", ha="center", va="center",
        color=NAVY, fontsize=12, fontweight="bold", family="serif")

# Fan-out arrows: Reporter → all destinations
for i in range(len(destinations)):
    yy_center = y_top - i * (dest_h + gap) - dest_h / 2
    arrow(10.05, 6.7, 11.78, yy_center, color=NAVY, lw=0.7)

# "1 click → N agencies" callout (placed below reporter, away from arrows)
ax.text(8, 4.7, "1 click → N agencies",
        ha="center", va="center", color=NAVY,
        fontsize=11, fontweight="bold", family="sans-serif",
        bbox=dict(boxstyle="round,pad=0.4", facecolor="white", edgecolor=NAVY, linewidth=1.5))

# ===== Bidirectional callback arrow =====
# Curve from middle-right of destinations stack back to the reporter
callback_arrow = FancyArrowPatch(
    (11.78, 3.6), (10.0, 5.6),
    arrowstyle="->,head_width=0.22,head_length=0.28",
    color=AMBER, lw=2.5, connectionstyle="arc3,rad=0.32", mutation_scale=14)
ax.add_patch(callback_arrow)
ax.text(8.0, 4.0, "Investigator callback → clinician inbox",
        ha="center", va="center", color=AMBER,
        fontsize=10, fontweight="bold", family="sans-serif",
        bbox=dict(boxstyle="round,pad=0.4", facecolor=CREAM, edgecolor=AMBER, linewidth=1.4))

# ===== State machine (bottom) =====
sm_y = 1.0
ax.text(0.5, sm_y + 1.6, "Per-delivery state machine",
        ha="left", va="center", color=NAVY,
        fontsize=12, fontweight="bold", family="serif")
ax.text(0.5, sm_y + 1.25, "every report tracks one delivery per destination through these states",
        ha="left", va="center", color=INK3,
        fontsize=9, family="sans-serif", style="italic")

state_w = 2.4
states = [
    ("submitted",         "#D4D0C5", INK1),
    ("received",          SAGE,      "white"),
    ("callback_pending",  AMBER,     "white"),
    ("reply_received",    TERRA,     "white"),
    ("closed",            NAVY,      "white"),
]
gap_s = 0.30
total_states_width = len(states) * state_w + (len(states) - 1) * gap_s
sm_x_start = (16 - total_states_width) / 2

for i, (name, c, tc) in enumerate(states):
    xx = sm_x_start + i * (state_w + gap_s)
    box(xx, sm_y, state_w, 0.7, name, "", color=c, text_color=tc, title_size=10)

# Forward arrows
for i in range(len(states) - 1):
    x1 = sm_x_start + i * (state_w + gap_s) + state_w
    x2 = sm_x_start + (i + 1) * (state_w + gap_s)
    arrow(x1, sm_y + 0.35, x2, sm_y + 0.35, color=INK3, lw=1.4)

# Bypass arrow: received → closed
bypass = FancyArrowPatch(
    (sm_x_start + 1 * (state_w + gap_s) + state_w * 0.7, sm_y + 0.7),
    (sm_x_start + 4 * (state_w + gap_s) + state_w * 0.3, sm_y + 0.7),
    arrowstyle="->,head_width=0.15,head_length=0.18",
    color=INK3, lw=0.9, linestyle="dashed",
    connectionstyle="arc3,rad=-0.4", mutation_scale=12)
ax.add_patch(bypass)
ax.text(sm_x_start + 2.5 * (state_w + gap_s) + state_w / 2, sm_y + 1.85,
        "no-callback path", ha="center", va="center",
        color=INK3, fontsize=8.5, style="italic", family="sans-serif")

# ===== Footer =====
ax.text(8, 0.25,
        "© 2026 NotifiAZ Capstone   ·   Synthetic data   ·   seed=42   ·   MVP, not for production deployment",
        ha="center", va="center", color=INK3, fontsize=8.5,
        family="sans-serif", style="italic")

plt.tight_layout()
out_png = OUT / "architecture_diagram.png"
out_svg = OUT / "architecture_diagram.svg"
plt.savefig(out_png, dpi=150, bbox_inches="tight", facecolor=CREAM, pad_inches=0.3)
plt.savefig(out_svg, bbox_inches="tight", facecolor=CREAM, pad_inches=0.3)
print(f"Wrote {out_png}")
print(f"Wrote {out_svg}")
