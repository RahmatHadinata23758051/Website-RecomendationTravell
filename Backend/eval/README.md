# RAG Retrieval Evaluation

Golden evaluation untuk `RagRetrieverService`. Tujuannya menangkap regresi ranking (mis. aturan stemming yang terlalu agresif, fusion yang rusak, atau perubahan stopword) sebelum sampai ke production.

## File

| File | Fungsi |
| --- | --- |
| `golden-queries.json` | Set query tetap beserta kriteria relevansi |
| `baseline-metrics.json` | Baseline terukur yang di-commit; gate dibandingkan ke file ini |
| `../src/chatbot/rag-golden-eval.spec.ts` | Spec yang menghitung metrik dan menjalankan gate |

## Relevansi berbasis kriteria, bukan ID tebakan

Setiap query mendeklarasikan constraint yang harus dipenuhi destinasi agar dihitung relevan:

```json
{ "id": "regency-pesawaran-beach", "query": "rekomendasi pantai di Pesawaran",
  "relevant": { "regency": "pesawaran", "category": "Pantai" } }
```

Constraint diambil dari katalog nyata (`Frontend/public/assets/data/public_destinations.json`), sehingga metrik mengukur kualitas retrieval — bukan kecocokan dengan daftar ID yang dipilih manual.

## Metrik

- **precisionAt3** — rata-rata proporsi hasil relevan di 3 teratas (ideal: 1.0)
- **hitRate** — fraksi query yang menghasilkan minimal satu hasil relevan di top-6
- **ndcg** — penalti bila relevansi tidak berada di posisi atas (ideal: 1.0)
- **avgDiversity** — rata-rata jumlah kabupaten berbeda pada query tanpa filter regency

Baseline saat ini: `precisionAt3 0.733`, `hitRate 1.0`, `ndcg 0.779`, `avgDiversity 4.4`.

## Menjalankan

```bash
npx jest src/chatbot/rag-golden-eval.spec.ts --runInBand
```

Melihat detail per-query (tanda `R` = relevan):

```bash
$env:RAG_EVAL_CALIBRATE='1'; npx jest src/chatbot/rag-golden-eval.spec.ts --runInBand
```

## Gate dan pembaruan baseline

Spec gagal bila metrik turun melewati toleransi (`precisionAt3 -0.1`, `hitRate -0.05`, `ndcg -0.02`, `avgDiversity -1`). Baseline **tidak pernah ditimpa otomatis**, jadi regresi tidak bisa menurunkan gate secara diam-diam.

Setelah perubahan retrieval yang disengaja, kalibrasi ulang lalu tulis baseline secara eksplisit:

```bash
$env:RAG_EVAL_WRITE_BASELINE='1'; npx jest src/chatbot/rag-golden-eval.spec.ts --runInBand
git add eval/baseline-metrics.json
```

Jangan menaikkan baseline agar test hijau ketika metrik turun tanpa disengaja — selidiki dulu penyebabnya.

## Menambah query

Tambahkan entri ke `golden-queries.json` dengan constraint yang diverifikasi terhadap katalog (nama, `city_or_regency`, `primary_category` yang valid). Jalankan ulang dengan `RAG_EVAL_CALIBRATE=1` untuk memastikan kriteria mengklasifikasikan hasil dengan benar, lalu tulis ulang baseline.