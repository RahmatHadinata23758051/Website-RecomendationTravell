import urllib.request
import urllib.parse
import json

base_url = "http://localhost:4000/api/v1"

def test_planner_budget(budget_level):
    url = f"{base_url}/planner/generate"
    payload = {
        "city_or_regency": "Kabupaten Pesawaran",
        "categories": ["Pantai", "Kuliner"],
        "primary_category": "Pantai",
        "budget_level": budget_level,
        "pace_style": "Santai",
        "duration_days": 1
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            total_cost = res.get('total_cost_estimate_idr', 0)
            slots = res['itinerary'][0]['slots']
            ai_tips = [s['aiTip'] for s in slots]
            costs = [s['numericCost'] for s in slots]
            names = [s['activityTitle'] for s in slots]
            
            print(f"[{budget_level.upper()}] Status: PASS")
            print(f"  Total Cost: Rp {int(total_cost):,}".replace(',', '.'))
            print(f"  Destinations: {names}")
            print(f"  Slot Costs: {costs}")
            print(f"  AI Tips: {ai_tips[0]}\n")
            return res
    except Exception as e:
        print(f"[{budget_level.upper()}] Status: FAIL - {e}\n")
        return None

print("=== STARTING QC E2E PLANNER BUDGET TEST ===\n")
res_backpacker = test_planner_budget("Backpacker")
res_standar = test_planner_budget("Standar")
res_mewah = test_planner_budget("Mewah")

print("=== E2E PLANNER BUDGET TEST COMPLETE ===")
