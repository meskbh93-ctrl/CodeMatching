#!/usr/bin/env node
/**
 * import-data.mjs
 * 
 * يستخدم هذا السكريبت لاستيراد البيانات من base44 إلى قاعدة بيانات PostgreSQL الجديدة.
 * 
 * الاستخدام:
 *   node scripts/import-data.mjs
 * 
 * المتطلبات:
 *   BASE44_APP_ID     — App ID من base44
 *   BASE44_TOKEN      — Access token من base44
 *   TARGET_URL        — رابط السيرفر الجديد (مثال: https://your-app.coolify.io)
 *   IMPORT_SECRET     — نفس الـ IMPORT_SECRET في .env
 */

const BASE44_APP_ID = process.env.BASE44_APP_ID;
const BASE44_TOKEN = process.env.BASE44_TOKEN;
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const IMPORT_SECRET = process.env.IMPORT_SECRET || 'change-me';

if (!BASE44_APP_ID || !BASE44_TOKEN) {
  console.error('❌ يجب تعيين BASE44_APP_ID و BASE44_TOKEN');
  process.exit(1);
}

const BASE44_API = 'https://api.base44.com';

async function fetchFromBase44(entity, limit = 10000) {
  console.log(`⬇️  جلب ${entity} من base44...`);
  const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/${entity}?limit=${limit}`, {
    headers: { Authorization: `Bearer ${BASE44_TOKEN}` },
  });
  if (!res.ok) throw new Error(`base44 error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function importToNew(entity, records) {
  console.log(`⬆️  استيراد ${records.length} سجل إلى ${entity}...`);
  // Split into batches of 500
  const batchSize = 500;
  let total = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const res = await fetch(`${TARGET_URL}/api/import/${entity}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-import-secret': IMPORT_SECRET,
      },
      body: JSON.stringify({ records: batch }),
    });
    if (!res.ok) throw new Error(`Import error: ${res.status} ${await res.text()}`);
    const { inserted } = await res.json();
    total += inserted;
    console.log(`   ✓ دفعة ${Math.floor(i/batchSize)+1}: ${inserted} سجل`);
  }
  console.log(`✅ ${entity}: ${total} سجل تم استيراده`);
}

async function main() {
  try {
    // Mandatory Products
    const mandatory = await fetchFromBase44('MandatoryProduct');
    await importToNew('mandatory_products', mandatory);

    // UNSPSC Codes
    const unspsc = await fetchFromBase44('UNSPSCCode');
    await importToNew('unspsc_codes', unspsc);

    // HS Codes
    const hs = await fetchFromBase44('HSCode');
    await importToNew('hs_codes', hs);

    console.log('\n🎉 تم استيراد جميع البيانات بنجاح!');
  } catch (err) {
    console.error('❌ خطأ:', err.message);
    process.exit(1);
  }
}

main();
