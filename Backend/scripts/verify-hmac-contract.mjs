import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const secret = 'shared-secret-key-32-bytes-minimum-length-ok';
const payload = {
  canonical_id: 'dest-sub-test-contract-001',
  name: 'Pantai Uji Kontrak',
  primary_category: 'beach',
  category_tags: ['pantai', 'alam'],
  city_or_regency: 'Kabupaten Pesawaran',
  address: 'Jl. Raya Way Urang',
  district: 'Padang Cermin',
  village: 'Way Urang',
  latitude: -5.5512,
  longitude: 105.2134,
  description: 'Pantai bersih dengan air jernih untuk pengujian HMAC contract.',
  facilities: ['has_parking', 'has_toilet'],
  opening_hours: null,
  price_min_idr: 15000,
  price_max_idr: 30000,
  price_status: 'paid',
  operational_status: 'open',
  review_count: 0,
  review_rating_mean: null,
};

const timestamp = Math.floor(Date.now() / 1000).toString();
const body = JSON.stringify(payload);

// 1. Generate signature in Node.js
const nodeSignature = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${body}`)
  .digest('hex');

// 2. Call Python to compute expected signature with its hmac module
const pythonScript = `
import hmac, hashlib, sys, json
secret = sys.argv[1].encode('utf-8')
timestamp = sys.argv[2].encode('ascii')
body = sys.argv[3].encode('utf-8')
expected = 'sha256=' + hmac.new(secret, timestamp + b'.' + body, hashlib.sha256).hexdigest()
print(expected)
`;

const candidates = ['python', 'python3', 'C:\\Users\\user\\Nata\\Project\\Recommendation-Traveller\\Machine-Learning\\.venv\\Scripts\\python.exe'];
let pythonSignature = null;

for (const cmd of candidates) {
  const res = spawnSync(cmd, ['-c', pythonScript, secret, timestamp, body], { encoding: 'utf-8' });
  if (!res.error && res.status === 0 && res.stdout.trim().startsWith('sha256=')) {
    pythonSignature = res.stdout.trim();
    break;
  }
}

assert.ok(pythonSignature, 'Must be able to execute python or python3 to compute HMAC');
assert.equal(nodeSignature, pythonSignature, 'Node and Python HMAC must match exactly');

// 3. Verify tampering detection
const tamperedBody = JSON.stringify({ ...payload, price_min_idr: 999999 });
const tamperedSig = 'sha256=' + crypto
  .createHmac('sha256', secret)
  .update(`${timestamp}.${tamperedBody}`)
  .digest('hex');

assert.notEqual(nodeSignature, tamperedSig, 'Tampered payload must produce different signature');

console.log('HMAC contract verification PASSED: Node.js and Python match byte-for-byte.');
