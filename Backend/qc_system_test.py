import requests
import json
import time

BASE_URL = "http://localhost:4000/api/v1"
TEST_USER = {
    "fullName": "QC Test Explorer",
    "email": f"qctest_{int(time.time())}@example.com",
    "password": "Password123!"
}

def print_result(phase, feature, status, details=""):
    badge = "PASS" if status else "FAIL"
    print(f"[{badge}] {phase} - {feature}: {details}")

def run_qc_suite():
    print("==================================================")
    print("   STARTING COMPREHENSIVE END-TO-END QC SUITE    ")
    print("==================================================\n")
    
    session = requests.Session()
    
    # 1. AUTHENTICATION & TOKEN
    print("--- Testing Auth System ---")
    reg_res = session.post(f"{BASE_URL}/auth/register", json=TEST_USER)
    if reg_res.status_code in [200, 201]:
        res_data = reg_res.json()
        token = res_data.get("token") or res_data.get("accessToken") or res_data.get("access_token") or (res_data.get("data") and res_data["data"].get("token")) or (res_data.get("data") and res_data["data"].get("accessToken"))
        user = res_data.get("user") or (res_data.get("data") and res_data["data"].get("user")) or {}
        session.headers.update({"Authorization": f"Bearer {token}"})
        print_result("Fase 0", "Register & Token Issuance", True, f"User ID: {user.get('id')}, Token length: {len(str(token))}")
    else:
        print_result("Fase 0", "Register", False, f"Status: {reg_res.status_code}")
        return

    # 2. FASE 2: PREFERENCES
    print("\n--- Testing Fase 2: User Preferences ---")
    pref_res = session.patch(f"{BASE_URL}/auth/preferences", json={"preferences": ["Pantai", "Alam", "Kuliner"]})
    if pref_res.status_code == 200:
        print_result("Fase 2", "Update Preferences", True, "Saved ['Pantai', 'Alam', 'Kuliner']")
    else:
        print_result("Fase 2", "Update Preferences", False, f"Status: {pref_res.status_code}")

    # 3. FASE 3: GAMIFIKASI XP & LEVEL EXPLORER
    print("\n--- Testing Fase 3: XP Gamification ---")
    xp_res = session.post(f"{BASE_URL}/auth/xp", json={"amount": 150, "action": "test_qc"})
    if xp_res.status_code == 200:
        new_xp = xp_res.json().get("data", {}).get("xp", 0)
        print_result("Fase 3", "Award XP (+150 XP)", True, f"Current Total XP: {new_xp}")
    else:
        print_result("Fase 3", "Award XP", False, f"Status: {xp_res.status_code}")

    # 4. FASE 4: USER ACTIVITIES (10 CAP LIMIT)
    print("\n--- Testing Fase 4: User Activities (10 Cap Limit) ---")
    for i in range(12):
        session.post(f"{BASE_URL}/activities", json={
            "action": f"test_action_{i}",
            "title": f"Aktivitas QC #{i+1}",
            "subtitle": "Pengujian Sistem",
            "iconType": "sparkles"
        })
    act_res = session.get(f"{BASE_URL}/activities")
    if act_res.status_code == 200:
        activities = act_res.json().get("data", [])
        is_cap_correct = len(activities) <= 10
        print_result("Fase 4", "Activities 10 Cap Limit", is_cap_correct, f"Fetched {len(activities)} items (Max 10)")
    else:
        print_result("Fase 4", "Activities Fetch", False, f"Status: {act_res.status_code}")

    # 5. FASE 5 & 7: ITINERARY & PUBLIC SHARE TOKEN
    print("\n--- Testing Fase 5 & 7: Itinerary & Social Sharing ---")
    itin_data = {
        "title": "Itinerary QC Test Lampung",
        "daysJson": [{"dayNumber": 1, "title": "Hari 1", "slots": []}]
    }
    create_itin_res = session.post(f"{BASE_URL}/itineraries", json=itin_data)
    if create_itin_res.status_code in [200, 201]:
        res_json = create_itin_res.json()
        created_itin = res_json.get("data") or res_json
        share_token = created_itin.get("shareToken")
        print_result("Fase 5", "Create & Save AI Itinerary", True, f"Itinerary ID: {created_itin.get('id')}")
        
        # Test Public Share Token Endpoint
        if share_token:
            public_res = requests.get(f"{BASE_URL}/itineraries/share/{share_token}")
            if public_res.status_code == 200:
                pub_json = public_res.json()
                pub_data = pub_json.get("data") or pub_json
                creator = pub_data.get("user", {})
                print_result("Fase 7", "Public Share Token Preview", True, f"Creator Name: {creator.get('fullName')}, XP: {creator.get('xp')}")
            else:
                print_result("Fase 7", "Public Share Token Preview", False, f"Status: {public_res.status_code}")
    else:
        print_result("Fase 5", "Create Itinerary", False, f"Status: {create_itin_res.status_code}")

    # 6. FASE 6: REVIEWS & INDOBERT SENTIMENT
    print("\n--- Testing Fase 6: Destination Reviews & Sentiment ---")
    rev_data = {
        "canonicalId": "pahawang-island-001",
        "rating": 5,
        "reviewText": "Pemandangan pantai Pahawang sangat bagus dan airnya sangat jernih luar biasa indah!"
    }
    rev_res = session.post(f"{BASE_URL}/reviews", json=rev_data)
    if rev_res.status_code in [200, 201]:
        rev_json = rev_res.json()
        created_rev = rev_json.get("data") or rev_json
        sentiment = created_rev.get("sentimentLabel")
        print_result("Fase 6", "Create Review with IndoBERT Sentiment", True, f"Rating: 5 Stars, Sentiment: {sentiment}")
    else:
        print_result("Fase 6", "Create Review", False, f"Status: {rev_res.status_code}")

    # 7. FASE 8: WISHLIST FAVORITES
    print("\n--- Testing Fase 8: Wishlist Favorites ---")
    fav_res = session.post(f"{BASE_URL}/favorites", json={"canonicalId": "pahawang-island-001"})
    if fav_res.status_code in [200, 201]:
        print_result("Fase 8", "Add Favorite to Wishlist", True, "Added pahawang-island-001")
        
        # Verify List
        get_fav_res = session.get(f"{BASE_URL}/favorites")
        if get_fav_res.status_code == 200:
            favs = get_fav_res.json().get("data", [])
            print_result("Fase 8", "Fetch Favorites List", True, f"Total Favorites: {len(favs)}")
            
            # Remove Favorite
            del_fav_res = session.delete(f"{BASE_URL}/favorites/pahawang-island-001")
            if del_fav_res.status_code == 200:
                print_result("Fase 8", "Delete Favorite from Wishlist", True, "Removed pahawang-island-001")
            else:
                print_result("Fase 8", "Delete Favorite", False, f"Status: {del_fav_res.status_code}")
    else:
        print_result("Fase 8", "Add Favorite", False, f"Status: {fav_res.status_code}")

    print("\n==================================================")
    print("          QC SUITE EXECUTION COMPLETED            ")
    print("==================================================")

if __name__ == "__main__":
    run_qc_suite()
