#!/usr/bin/env python3
"""Analyze all match files from History folder."""
import os
import re
import json
from collections import defaultdict

HISTORY_DIR = r"D:\WORK\LINH\pro-football-analytics-v2\History"

# Get all match files
all_files = sorted([f for f in os.listdir(HISTORY_DIR) if f.startswith("match_") and f.endswith(".md")])
print(f"Total match files: {len(all_files)}")

match_data = []

for fname in all_files:
    fpath = os.path.join(HISTORY_DIR, fname)
    
    # Parse filename
    parts = fname.replace(".md", "").split("_")
    match_id = parts[1]
    # The rest is teams + date
    date_str = parts[-1]
    team_str = "_".join(parts[2:-1]).replace("-", " ")
    
    # Read file
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # --- Extract stats from JSON block ---
    # Score from info table
    m = re.search(r"Tỷ số\s*\|\s*([\d-]+)", content)
    score_str = m.group(1) if m else "?"
    
    # Stats JSON - parse the JSON block
    stats = {}
    # goals
    m = re.search(r'"goals":\s*\[\s*"(\d+)",\s*"(\d+)"', content)
    if m:
        stats["home_goals"] = int(m.group(1))
        stats["away_goals"] = int(m.group(2))
        stats["total_goals"] = stats["home_goals"] + stats["away_goals"]
    
    m = re.search(r'"xg":\s*\[\s*"([\d.]+)",\s*"([\d.]+)"', content)
    if m:
        stats["home_xg"] = float(m.group(1))
        stats["away_xg"] = float(m.group(2))
        stats["total_xg"] = round(stats["home_xg"] + stats["away_xg"], 2)
    
    for key in ["goalattempts", "on_target", "off_target", "dangerous_attacks", 
                "attacks", "corners", "possession_rt", "crosses", "key_passes",
                "yellowcards", "redcards"]:
        m = re.search(r'"' + key + r'":\s*\[\s*"([\d.]+)",\s*"([\d.]+)"', content)
        if m:
            stats[key] = (float(m.group(1)), float(m.group(2)))
    
    m = re.search(r'"passing_accuracy":\s*\[\s*"([\d.]+)",\s*"([\d.]+)"', content)
    if m:
        stats["passing_accuracy"] = (float(m.group(1)), float(m.group(2)))
    
    m = re.search(r'"crossing_accuracy":\s*\[\s*"([\d.]+)",\s*"([\d.]+)"', content)
    if m:
        stats["crossing_accuracy"] = (float(m.group(1)), float(m.group(2)))
    
    # --- Prediction data ---
    # Find GoalProb 30' values
    gp30_values = re.findall(r"\|\s*(\d+)\s*\|\s*\d+\s*\|\s*([\d.]+)%\s*\|\s*(có|không)\s*\|\s*(CÓ|KHÔNG)\s*\|\s*(auto|tay)\s*\|\s*(✓|✗)", content)
    gp15_values = re.findall(r"\|\s*(\d+)\s*\|\s*\d+\s*\|\s*([\d.]+)%\s*\|\s*(có|không)\s*\|\s*(CÓ|KHÔNG)\s*\|\s*(auto|tay)\s*\|\s*(✓|✗)", content)
    
    # The pattern matches both tables - first set is 30', second is 15'
    # But they're identical patterns. Let me use the headers to distinguish.
    
    # Better: use section markers
    # Split content by sections
    sections = content.split("### Lịch sử dự đoán")
    
    gp30_rows = []
    gp15_rows = []
    
    if len(sections) >= 2:
        # Section 1: 30' window
        section30 = sections[1]
        gp30_rows = re.findall(r"\|\s*(\d+)\s*\|\s*\d+\s*\|\s*([\d.]+)%\s*\|\s*(có|không)\s*\|\s*(CÓ|KHÔNG)\s*\|\s*(auto|tay)\s*\|\s*(✓|✗)", section30)
    
    if len(sections) >= 3:
        # Section 2: 15' window
        section15 = sections[2]
        gp15_rows = re.findall(r"\|\s*(\d+)\s*\|\s*\d+\s*\|\s*([\d.]+)%\s*\|\s*(có|không)\s*\|\s*(CÓ|KHÔNG)\s*\|\s*(auto|tay)\s*\|\s*(✓|✗)", section15)
    
    # Calculate accuracy
    correct_30 = sum(1 for r in gp30_rows if r[5] == "✓")
    total_30 = len(gp30_rows)
    acc_30 = correct_30 / total_30 if total_30 > 0 else None
    
    correct_15 = sum(1 for r in gp15_rows if r[5] == "✓")
    total_15 = len(gp15_rows)
    acc_15 = correct_15 / total_15 if total_15 > 0 else None
    
    # Average GoalProb
    avg_gp30 = sum(float(r[1]) for r in gp30_rows) / len(gp30_rows) if gp30_rows else None
    avg_gp15 = sum(float(r[1]) for r in gp15_rows) / len(gp15_rows) if gp15_rows else None
    
    # --- Alert data ---
    alert_count = len(re.findall(r"CẢNH BÁO", content))
    pressure2_count = len(re.findall(r"ÁP LỰC CỰC ĐẠI", content))
    
    # --- Corner events ---
    corner_events = len(re.findall(r"\|\s*\d+\s*\|\s*\d+\s*\|\s*corner", content))
    
    # --- Goal events ---
    goal_events = len(re.findall(r"\|\s*\d+\s*\|\s*\d+\s*\|\s*goal", content))
    
    # --- Bet tickets ---
    bet_count = len(re.findall(r"Tài|Xỉu|Chấp", content.split("## Vé cược")[1].split("##")[0] if "## Vé cược" in content else ""))
    bets_won = len(re.findall(r"\|\s*won\s*\|", content))
    bets_lost = len(re.findall(r"\|\s*lost\s*\|", content))
    
    # Model info
    model_m = re.search(r"_Model \(30'\): `(\S+)`", content)
    model_ver = model_m.group(1) if model_m else "?"
    
    auc_m = re.search(r"AUC ([\d.]+)", content)
    auc = float(auc_m.group(1)) if auc_m else None
    
    match_data.append({
        "file": fname,
        "match_id": match_id,
        "teams": team_str,
        "date": date_str,
        "score": score_str,
        **stats,
        # Prediction
        "pred_count_30": total_30,
        "pred_correct_30": correct_30,
        "pred_acc_30": acc_30,
        "pred_count_15": total_15,
        "pred_correct_15": correct_15,
        "pred_acc_15": acc_15,
        "avg_gp30": avg_gp30,
        "avg_gp15": avg_gp15,
        # Events
        "alerts": alert_count,
        "pressure2": pressure2_count,
        "corner_events": corner_events,
        "goal_events": goal_events,
        # Bets
        "bets_total": bet_count,
        "bets_won": bets_won,
        "bets_lost": bets_lost,
        # Model
        "model_ver": model_ver,
        "auc": auc,
        # Raw prediction rows
        "gp30_rows": gp30_rows,
    })

print(f"Parsed {len(match_data)} matches")

# --- ANALYSIS ---

# 1. Overall stats
total_matches = len(match_data)
matches_with_goals = [m for m in match_data if "total_goals" in m]
total_goals = sum(m.get("total_goals", 0) for m in matches_with_goals)
avg_goals = total_goals / len(matches_with_goals) if matches_with_goals else 0

zero_zero = sum(1 for m in matches_with_goals if m.get("total_goals", -1) == 0)
one_nil = sum(1 for m in matches_with_goals if m.get("total_goals", -1) == 1)
over25 = sum(1 for m in matches_with_goals if m.get("total_goals", -1) >= 3)
over45 = sum(1 for m in matches_with_goals if m.get("total_goals", -1) >= 5)

print(f"\n{'='*80}")
print(f"PHẦN 1: THỐNG KÊ TỔNG QUAN {total_matches} TRẬN")
print(f"{'='*80}")
print(f"Tổng bàn thắng: {total_goals} | TB: {avg_goals:.2f} bàn/trận")
print(f"0-0: {zero_zero} ({zero_zero/total_matches*100:.1f}%)")
print(f"1 bàn: {one_nil} ({one_nil/total_matches*100:.1f}%)")
print(f"≥3 bàn (Over 2.5): {over25} ({over25/total_matches*100:.1f}%)")
print(f"≥5 bàn: {over45} ({over45/total_matches*100:.1f}%)")

# 2. Prediction accuracy
pred_matches = [m for m in match_data if m["pred_acc_30"] is not None]
total_c30 = sum(m["pred_correct_30"] for m in pred_matches)
total_p30 = sum(m["pred_count_30"] for m in pred_matches)
acc30_overall = total_c30 / total_p30 * 100 if total_p30 > 0 else 0

pred15_matches = [m for m in match_data if m["pred_acc_15"] is not None]
total_c15 = sum(m["pred_correct_15"] for m in pred15_matches)
total_p15 = sum(m["pred_count_15"] for m in pred15_matches)
acc15_overall = total_c15 / total_p15 * 100 if total_p15 > 0 else 0

print(f"\n{'='*80}")
print(f"PHẦN 2: ĐỘ CHÍNH XÁC DỰ ĐOÁN")
print(f"{'='*80}")
print(f"Cửa sổ 30': {total_c30}/{total_p30} = {acc30_overall:.1f}%")
print(f"Cửa sổ 15': {total_c15}/{total_p15} = {acc15_overall:.1f}%")

# 3. Accuracy by match (top/bottom)
acc30_list = [(m["teams"], m["pred_acc_30"], m["pred_count_30"], m.get("total_goals", "?"), m["file"]) for m in pred_matches]
top5 = sorted(acc30_list, key=lambda x: -x[1])[:5]
worst5 = sorted(acc30_list, key=lambda x: x[1])[:5]

print(f"\nTop 5 trận dự đoán 30' CHÍNH XÁC NHẤT:")
for t, a, n, g, f in top5:
    print(f"  {t[:30]:30s} | Acc: {a*100:.0f}% ({n} lần) | Goals: {g}")

print(f"\nTop 5 trận dự đoán 30' KÉM NHẤT:")
for t, a, n, g, f in worst5:
    print(f"  {t[:30]:30s} | Acc: {a*100:.0f}% ({n} lần) | Goals: {g}")

# 4. Error analysis: when model predicts "có" but result is "KHÔNG" (false positive)
all_false_positives = []
all_false_negatives = []

for m in pred_matches:
    for r in m["gp30_rows"]:
        minute = int(r[0])
        prob = float(r[1])
        label = r[2]  # có/không
        actual = r[3]  # CÓ/KHÔNG
        correct = r[5]  # ✓/✗
        
        if correct == "✗":
            if label == "có" and actual == "KHÔNG":
                all_false_positives.append((m["teams"], minute, prob, m.get("total_goals", "?")))
            elif label == "không" and actual == "CÓ":
                all_false_negatives.append((m["teams"], minute, prob, m.get("total_goals", "?")))

print(f"\n{'='*80}")
print(f"PHẦN 3: PHÂN TÍCH SAI LẦM")
print(f"{'='*80}")
print(f"False Positives (model nói CÓ nhưng không bàn): {len(all_false_positives)}")
print(f"False Negatives (model nói KHÔNG nhưng có bàn): {len(all_false_negatives)}")

# FP by GoalProb range
fp_by_range = defaultdict(int)
for _, _, prob, _ in all_false_positives:
    if prob < 60: fp_by_range["50-60%"] += 1
    elif prob < 70: fp_by_range["60-70%"] += 1
    elif prob < 80: fp_by_range["70-80%"] += 1
    else: fp_by_range["80%+"] += 1

fn_by_range = defaultdict(int)
for _, _, prob, _ in all_false_negatives:
    if prob < 45: fn_by_range["<45%"] += 1
    else: fn_by_range["45-50%"] += 1

print(f"FP phân bố theo GoalProb:")
for r, c in sorted(fp_by_range.items()):
    print(f"  {r}: {c} lần")

# 5. GoalProb distribution vs actual goals
gp_buckets = defaultdict(lambda: {"count": 0, "had_goal": 0, "no_goal": 0})
for m in pred_matches:
    for r in m["gp30_rows"]:
        prob = float(r[1])
        actual = r[3]
        bucket = int(prob // 10) * 10
        gp_buckets[bucket]["count"] += 1
        if actual == "CÓ":
            gp_buckets[bucket]["had_goal"] += 1
        else:
            gp_buckets[bucket]["no_goal"] += 1

print(f"\nGoalProb 30' vs Thực tế (CÓ bàn trong 30'):")
print(f"{'Khoảng':>10} | {'SL':>5} | {'Có bàn':>8} | {'Không':>8} | {'Tỉ lệ Có':>10}")
print("-"*50)
for b in sorted(gp_buckets.keys()):
    d = gp_buckets[b]
    rate = d["had_goal"] / d["count"] * 100 if d["count"] > 0 else 0
    print(f"{b:>4}-{b+9:>3}% | {d['count']:>5} | {d['had_goal']:>8} | {d['no_goal']:>8} | {rate:>8.1f}%")

# 6. XG vs actual goals comparison
xg_matches = [m for m in matches_with_goals if "total_xg" in m and m.get("total_goals", -1) >= 0]
xg_diff = []
for m in xg_matches:
    diff = round(m["total_xg"] - m["total_goals"], 2)
    xg_diff.append((m["teams"], m["total_xg"], m["total_goals"], diff, m.get("score", "?")))

over_xg = sum(1 for _, _, g, d, _ in xg_diff if d > 1)
under_xg = sum(1 for _, _, g, d, _ in xg_diff if d < -1)
normal_xg = len(xg_diff) - over_xg - under_xg

print(f"\n{'='*80}")
print(f"PHẦN 4: xG vs BÀN THỰC TẾ")
print(f"{'='*80}")
print(f"xG cao hơn bàn thực tế ≥1: {over_xg} trận")
print(f"Bàn thực tế cao hơn xG ≥1: {under_xg} trận")
print(f"xG xấp xỉ thực tế: {normal_xg} trận")

# Biggest xG outliers
print(f"\nxG cao nhất (underperformers - nhiều xG ít bàn):")
sorted_xg = sorted(xg_diff, key=lambda x: -x[2])  # sort by diff negative
for t, xg_val, g, d, s in sorted_xg[:5]:
    print(f"  {t[:30]:30s} | xG: {xg_val:.2f} | Bàn: {g} | Lệch: {d:+.2f} | {s}")

print(f"\nxG thấp nhất (overperformers - ít xG nhiều bàn):")
for t, xg_val, g, d, s in reversed(sorted_xg[-5:]):
    print(f"  {t[:30]:30s} | xG: {xg_val:.2f} | Bàn: {g} | Lệch: {d:+.2f} | {s}")

# 7. Possession vs result
print(f"\n{'='*80}")
print(f"PHẦN 5: KIỂM SOÁT BÓNG & KẾT QUẢ")
print(f"{'='*80}")
dominated_wins = 0
dominated_draws = 0
dominated_losses = 0
for m in matches_with_goals:
    if "possession_rt" in m and "home_goals" in m and "away_goals" in m:
        hp, ap = m["possession_rt"]
        hg, ag = m["home_goals"], m["away_goals"]
        if hp > 60:  # đội chủ nhà áp đảo
            if hg > ag:
                dominated_wins += 1
            elif hg == ag:
                dominated_draws += 1
            else:
                dominated_losses += 1

print(f"Đội nhà ≥60% possession: {dominated_wins}W / {dominated_draws}D / {dominated_losses}L")

# 8. Corner/cross analysis
print(f"\n{'='*80}")
print(f"PHẦN 6: CORNER & CROSSING")
print(f"{'='*80}")
high_corner = [m for m in matches_with_goals if "corners" in m]
for m in high_corner:
    hc, ac = m["corners"]
    hg, ag = m["home_goals"], m["away_goals"]
    # Analyze: many corners but few goals
    # We're interested in the ratio corners/goals

# 9. Shot conversion
print(f"\n{'='*80}")
print(f"PHẦN 7: HIỆU SUẤT DỨT ĐIỂM")
print(f"{'='*80}")
conversion_list = []
for m in matches_with_goals:
    if "goalattempts" in m and "on_target" in m and "home_goals" in m and "away_goals" in m:
        h_shots, a_shots = m["goalattempts"]
        h_ot, a_ot = m["on_target"]
        hg, ag = m["home_goals"], m["away_goals"]
        
        if h_shots > 0:
            h_conv = hg / h_shots * 100
        else:
            h_conv = 0
        if a_shots > 0:
            a_conv = ag / a_shots * 100
        else:
            a_conv = 0
        
        conversion_list.append({
            "teams": m["teams"],
            "score": m.get("score", "?"),
            "home_conv": h_conv,
            "away_conv": a_conv,
            "home_shots": h_shots,
            "away_shots": a_shots,
            "home_ontarget": h_ot,
            "away_ontarget": a_ot,
            "home_goals": hg,
            "away_goals": ag
        })

# Best conversion
sorted_conv = sorted(conversion_list, key=lambda x: -(x["home_conv"] + x["away_conv"]))
print(f"Teams with highest conversion (goals/shot):")
for c in sorted_conv[:5]:
    print(f"  {c['teams'][:30]:30s} | {c['score']:5s} | Home: {c['home_goals']}/{c['home_shots']} ({c['home_conv']:.0f}%) | Away: {c['away_goals']}/{c['away_shots']} ({c['away_conv']:.0f}%)")

print(f"\nTeams with lowest conversion:")
for c in sorted_conv[-5:]:
    print(f"  {c['teams'][:30]:30s} | {c['score']:5s} | Home: {c['home_goals']}/{c['home_shots']} ({c['home_conv']:.0f}%) | Away: {c['away_goals']}/{c['away_shots']} ({c['away_conv']:.0f}%)")

# --- SAVE ---
with open(os.path.join(HISTORY_DIR, "_analysis_complete.json"), "w", encoding="utf-8") as f:
    json.dump({
        "total_matches": total_matches,
        "total_goals": total_goals,
        "avg_goals": avg_goals,
        "zero_zero": zero_zero,
        "over25": over25,
        "accuracy_30": {"correct": total_c30, "total": total_p30, "rate": acc30_overall},
        "accuracy_15": {"correct": total_c15, "total": total_p15, "rate": acc15_overall},
        "false_positives_30": len(all_false_positives),
        "false_negatives_30": len(all_false_negatives),
        "gp_buckets": {str(k): v for k, v in sorted(gp_buckets.items())},
        "matches": match_data
    }, f, ensure_ascii=False, indent=2)

print(f"\n{'='*80}")
print(f"ĐÃ LƯU: _analysis_complete.json")
print(f"{'='*80}")

# Print a few notable matches
print(f"\nNHỮNG TRẬN ĐẶC BIỆT:")
print(f"{'='*80}")
for m in match_data:
    if m.get("total_goals", -1) == 0 and m.get("total_xg", -1) >= 2:
        print(f"  ⚠️  {m['teams'][:35]:35s} | {m['score']:5s} | xG: {m['total_xg']:.2f} | DA trội | {m['file']}")
    if m.get("total_goals", -1) >= 5:
        print(f"  💥 {m['teams'][:35]:35s} | {m['score']:5s} | xG: {m.get('total_xg', '?'):5} | {m['file']}")
    if m.get("pred_acc_30", 1) is not None and m["pred_acc_30"] <= 0.3:
        print(f"  ❌ {m['teams'][:35]:35s} | Acc30: {m['pred_acc_30']*100:.0f}% | {m['file']}")

print(f"\nDone! Check _analysis_complete.json for full data.")