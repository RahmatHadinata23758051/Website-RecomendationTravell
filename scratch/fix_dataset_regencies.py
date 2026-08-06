import json
import os

filepath = 'Frontend/public/assets/data/public_destinations.json'
if not os.path.exists(filepath):
    filepath = 'Website/Frontend/public/assets/data/public_destinations.json'

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

fixed = 0
for d in data:
    name = (d.get('name') or '').lower()
    address = (d.get('address') or '').lower()
    full_text = f"{name} {address}"

    # Pesisir Barat
    if any(k in full_text for k in ['jukung', 'tanjung setia', 'pulau pisang', 'krui', 'ngambur', 'pesisir tengah', 'pesisir selatan', 'pesisir utara', 'lemong', 'karya pengawa']):
        if d.get('city_or_regency') != 'Kabupaten Pesisir Barat':
            print(f"[PESISIR BARAT FIX] {d.get('name')}: {d.get('city_or_regency')} -> Kabupaten Pesisir Barat")
            d['city_or_regency'] = 'Kabupaten Pesisir Barat'
            fixed += 1

    # Pesawaran
    elif any(k in full_text for k in ['pahawang', 'sari ringgung', 'dewi mandapa', 'pantai mutun', 'pulau mahitam', 'kelagian', 'padang cermin', 'marga punduh', 'way ratai', 'hanura']):
        if d.get('city_or_regency') != 'Kabupaten Pesawaran':
            print(f"[PESAWARAN FIX] {d.get('name')}: {d.get('city_or_regency')} -> Kabupaten Pesawaran")
            d['city_or_regency'] = 'Kabupaten Pesawaran'
            fixed += 1

    # Tanggamus
    elif any(k in full_text for k in ['kiluan', 'gigi hiu', 'way lalaan', 'gisting', 'kota agung', 'limau', 'pematang sawa', 'batu tegi', 'teluk semangka']):
        if d.get('city_or_regency') != 'Kabupaten Tanggamus':
            print(f"[TANGGAMUS FIX] {d.get('name')}: {d.get('city_or_regency')} -> Kabupaten Tanggamus")
            d['city_or_regency'] = 'Kabupaten Tanggamus'
            fixed += 1

    # Lampung Barat
    elif any(k in full_text for k in ['danau ranau', 'keramikan', 'suoh', 'liwa', 'pesagi', 'sekincau', 'balik bukit', 'sukau']):
        if d.get('city_or_regency') != 'Kabupaten Lampung Barat':
            print(f"[LAMPUNG BARAT FIX] {d.get('name')}: {d.get('city_or_regency')} -> Kabupaten Lampung Barat")
            d['city_or_regency'] = 'Kabupaten Lampung Barat'
            fixed += 1

    # Lampung Selatan
    elif any(k in full_text for k in ['menara siger', 'kalianda', 'sebalang', 'pantai marina', 'dermaga bom', 'bakauheni', 'rajabasa', 'merak belantung', 'sidomulyo']):
        if d.get('city_or_regency') != 'Kabupaten Lampung Selatan':
            print(f"[LAMPUNG SELATAN FIX] {d.get('name')}: {d.get('city_or_regency')} -> Kabupaten Lampung Selatan")
            d['city_or_regency'] = 'Kabupaten Lampung Selatan'
            fixed += 1

    # Tulang Bawang Barat
    elif any(k in full_text for k in ['tubaba', 'panaragan', 'masjid 99 cahaya', 'nago besanding', 'tulang bawang udik', 'tulang bawang tengah']):
        if d.get('city_or_regency') != 'Kabupaten Tulang Bawang Barat':
            print(f"[TUBABA FIX] {d.get('name')}: {d.get('city_or_regency')} -> Kabupaten Tulang Bawang Barat")
            d['city_or_regency'] = 'Kabupaten Tulang Bawang Barat'
            fixed += 1

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"\nSUCCESS! Total dataset regency fixes applied: {fixed}")
