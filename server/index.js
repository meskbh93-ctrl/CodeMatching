import express from 'express';
import cors from 'cors';
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── DB Init ────────────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_logs (
      id SERIAL PRIMARY KEY,
      query TEXT NOT NULL,
      mandatory_count INT DEFAULT 0,
      unspsc_count INT DEFAULT 0,
      hs_count INT DEFAULT 0,
      lang VARCHAR(5) DEFAULT 'ar',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mandatory_products (
      id SERIAL PRIMARY KEY,
      segment_no TEXT,
      segment_title_ar TEXT,
      segment_title_en TEXT,
      etimad_code TEXT,
      product_name_ar TEXT,
      product_name_en TEXT,
      product_desc_ar TEXT,
      product_desc_en TEXT,
      effective_date TEXT,
      sector TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS unspsc_codes (
      id SERIAL PRIMARY KEY,
      key BIGINT,
      parent_key BIGINT,
      code TEXT,
      title TEXT
    );

    CREATE TABLE IF NOT EXISTS hs_codes (
      id SERIAL PRIMARY KEY,
      code TEXT,
      name_ar TEXT,
      name_en TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_mandatory_etimad ON mandatory_products(etimad_code);
    CREATE INDEX IF NOT EXISTS idx_unspsc_code ON unspsc_codes(code);
    CREATE INDEX IF NOT EXISTS idx_hs_code ON hs_codes(code);
  `);
  console.log('✅ DB initialized');
}

// ─── MandatoryProduct Routes ─────────────────────────────────────────────────
app.get('/api/entities/MandatoryProduct/list', async (req, res) => {
  try {
    const { sort = 'id', limit = 5000 } = req.query;
    const col = sort.startsWith('-') ? sort.slice(1) : sort;
    const dir = sort.startsWith('-') ? 'DESC' : 'ASC';
    const safe = ['id','segment_title_ar','segment_title_en','etimad_code','product_name_ar'].includes(col) ? col : 'id';
    const result = await pool.query(`SELECT * FROM mandatory_products ORDER BY ${safe} ${dir} LIMIT $1`, [limit]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/entities/MandatoryProduct/filter', async (req, res) => {
  try {
    const { filter = {}, limit = 500 } = req.body;
    const q = filter.$or ? extractQuery(filter.$or) : '';
    if (!q) return res.json([]);
    const result = await pool.query(`
      SELECT * FROM mandatory_products
      WHERE product_name_ar ILIKE $1 OR product_name_en ILIKE $1
         OR product_desc_ar ILIKE $1 OR product_desc_en ILIKE $1
         OR segment_title_ar ILIKE $1 OR segment_title_en ILIKE $1
         OR etimad_code ILIKE $1
      LIMIT $2
    `, [`%${q}%`, limit]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── UNSPSCCode Routes ────────────────────────────────────────────────────────
app.post('/api/entities/UNSPSCCode/filter', async (req, res) => {
  try {
    const { filter = {}, limit = 100 } = req.body;
    const q = filter.title?.$regex || '';
    if (!q) return res.json([]);
    const result = await pool.query(`SELECT * FROM unspsc_codes WHERE title ILIKE $1 LIMIT $2`, [`%${q}%`, limit]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── HSCode Routes ────────────────────────────────────────────────────────────
app.post('/api/entities/HSCode/filter', async (req, res) => {
  try {
    const { filter = {}, limit = 100 } = req.body;
    const q = filter.$or ? extractQuery(filter.$or) : '';
    if (!q) return res.json([]);
    const result = await pool.query(`SELECT * FROM hs_codes WHERE name_ar ILIKE $1 OR name_en ILIKE $1 LIMIT $2`, [`%${q}%`, limit]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SearchLog Routes ─────────────────────────────────────────────────────────
app.post('/api/entities/SearchLog/create', async (req, res) => {
  try {
    const { query, mandatory_count, unspsc_count, hs_count, lang } = req.body;
    const result = await pool.query(
      `INSERT INTO search_logs(query,mandatory_count,unspsc_count,hs_count,lang) VALUES($1,$2,$3,$4,$5) RETURNING *`,
      [query, mandatory_count||0, unspsc_count||0, hs_count||0, lang||'ar']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/entities/SearchLog/list', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await pool.query(`SELECT * FROM search_logs ORDER BY created_at DESC LIMIT $1`, [limit]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/entities/SearchLog/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM search_logs WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── AI / LLM Route ───────────────────────────────────────────────────────────
app.post('/api/integrations/llm', async (req, res) => {
  try {
    const { prompt } = req.body;
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ result: message.content[0].text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Data Import Route ────────────────────────────────────────────────────────
app.post('/api/import/:entity', async (req, res) => {
  const secret = req.headers['x-import-secret'];
  if (secret !== process.env.IMPORT_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { entity } = req.params;
  const { records } = req.body;
  if (!records || !Array.isArray(records)) return res.status(400).json({ error: 'records array required' });

  try {
    let inserted = 0;
    for (const r of records) {
      if (entity === 'mandatory_products') {
        await pool.query(
          `INSERT INTO mandatory_products(segment_no,segment_title_ar,segment_title_en,etimad_code,product_name_ar,product_name_en,product_desc_ar,product_desc_en,effective_date,sector,notes)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [r.segment_no,r.segment_title_ar,r.segment_title_en,r.etimad_code,r.product_name_ar,r.product_name_en,r.product_desc_ar,r.product_desc_en,r.effective_date,r.sector,r.notes]
        );
      } else if (entity === 'unspsc_codes') {
        await pool.query(`INSERT INTO unspsc_codes(key,parent_key,code,title) VALUES($1,$2,$3,$4)`,
          [r.key,r.parent_key,r.code,r.title]);
      } else if (entity === 'hs_codes') {
        await pool.query(`INSERT INTO hs_codes(code,name_ar,name_en) VALUES($1,$2,$3)`,
          [r.code,r.name_ar,r.name_en]);
      }
      inserted++;
    }
    res.json({ inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true }));

// ─── Serve frontend (production) ───────────────────────────────────────────────
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));

// ─── Helpers ───────────────────────────────────────────────────────────────────
function extractQuery(orArray) {
  for (const cond of orArray) {
    const val = Object.values(cond)[0];
    if (val?.$regex) return val.$regex;
  }
  return '';
}

// ─── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
});
