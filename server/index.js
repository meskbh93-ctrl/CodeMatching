import express from 'express';
import cors from 'cors';
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-secret-key';

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── DB Init ────────────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS search_logs (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
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

    CREATE TABLE IF NOT EXISTS user_dictionary (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      word_ar TEXT NOT NULL,
      word_en TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, word_ar)
    );

    CREATE TABLE IF NOT EXISTS result_feedback (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      query TEXT NOT NULL,
      result_type VARCHAR(20) NOT NULL,
      result_id TEXT NOT NULL,
      confirmed BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, query, result_type, result_id)
    );

    CREATE INDEX IF NOT EXISTS idx_mandatory_etimad ON mandatory_products(etimad_code);
    CREATE INDEX IF NOT EXISTS idx_unspsc_code ON unspsc_codes(code);
    CREATE INDEX IF NOT EXISTS idx_hs_code ON hs_codes(code);
    CREATE INDEX IF NOT EXISTS idx_feedback_user ON result_feedback(user_id, query);
    CREATE INDEX IF NOT EXISTS idx_dict_user ON user_dictionary(user_id);
  `);
  console.log('DB initialized');
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6)
      return res.status(400).json({ error: 'Email and password (min 6 chars) required' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users(email, password_hash) VALUES($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase().trim(), hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, token });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user: { id: user.id, email: user.email, created_at: user.created_at }, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, created_at FROM users WHERE id=$1', [req.user.id]);
    res.json(result.rows[0] || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── User Dictionary Routes ───────────────────────────────────────────────────
app.get('/api/dictionary', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_dictionary WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/dictionary', requireAuth, async (req, res) => {
  try {
    const { word_ar, word_en } = req.body;
    if (!word_ar || !word_en) return res.status(400).json({ error: 'word_ar and word_en required' });
    const result = await pool.query(
      `INSERT INTO user_dictionary(user_id, word_ar, word_en)
       VALUES($1, $2, $3)
       ON CONFLICT(user_id, word_ar) DO UPDATE SET word_en=EXCLUDED.word_en
       RETURNING *`,
      [req.user.id, word_ar.trim(), word_en.trim()]
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Result Feedback (Self-Learning) ─────────────────────────────────────────
app.post('/api/feedback', requireAuth, async (req, res) => {
  try {
    const { query, result_type, result_id, confirmed } = req.body;
    if (!query || !result_type || result_id == null || confirmed == null)
      return res.status(400).json({ error: 'Missing fields' });
    await pool.query(
      `INSERT INTO result_feedback(user_id, query, result_type, result_id, confirmed)
       VALUES($1, $2, $3, $4, $5)
       ON CONFLICT(user_id, query, result_type, result_id) DO UPDATE SET confirmed=EXCLUDED.confirmed`,
      [req.user.id, query.trim().toLowerCase(), result_type, String(result_id), confirmed]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/feedback/rejected', requireAuth, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    const result = await pool.query(
      `SELECT result_type, result_id FROM result_feedback
       WHERE user_id=$1 AND query=$2 AND confirmed=false`,
      [req.user.id, query.trim().toLowerCase()]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
    const terms = filter.$or ? extractTerms(filter.$or) : [];
    if (!terms.length) return res.json([]);
    const conditions = terms.map((_, i) =>
      `(product_name_ar ILIKE $${i+1} OR product_name_en ILIKE $${i+1}
       OR product_desc_ar ILIKE $${i+1} OR product_desc_en ILIKE $${i+1}
       OR segment_title_ar ILIKE $${i+1} OR segment_title_en ILIKE $${i+1}
       OR etimad_code ILIKE $${i+1})`
    ).join(' OR ');
    const result = await pool.query(
      `SELECT * FROM mandatory_products WHERE ${conditions} LIMIT $${terms.length + 1}`,
      [...terms.map(t => `%${t}%`), limit]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── UNSPSCCode Routes ────────────────────────────────────────────────────────
app.post('/api/entities/UNSPSCCode/filter', async (req, res) => {
  try {
    const { filter = {}, limit = 100 } = req.body;
    const terms = filter.$or
      ? filter.$or.map(c => c.title?.$regex).filter(Boolean)
      : [filter.title?.$regex].filter(Boolean);
    if (!terms.length) return res.json([]);
    const conditions = terms.map((_, i) => `title ILIKE $${i+1}`).join(' OR ');
    const result = await pool.query(
      `SELECT * FROM unspsc_codes WHERE ${conditions} LIMIT $${terms.length + 1}`,
      [...terms.map(t => `%${t}%`), limit]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── HSCode Routes ────────────────────────────────────────────────────────────
app.post('/api/entities/HSCode/filter', async (req, res) => {
  try {
    const { filter = {}, limit = 100 } = req.body;
    const terms = filter.$or ? extractTerms(filter.$or) : [];
    if (!terms.length) return res.json([]);
    const conditions = terms.map((_, i) => `(name_ar ILIKE $${i+1} OR name_en ILIKE $${i+1})`).join(' OR ');
    const result = await pool.query(
      `SELECT * FROM hs_codes WHERE ${conditions} LIMIT $${terms.length + 1}`,
      [...terms.map(t => `%${t}%`), limit]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SearchLog Routes ─────────────────────────────────────────────────────────
app.post('/api/entities/SearchLog/create', requireAuth, async (req, res) => {
  try {
    const { query, mandatory_count, unspsc_count, hs_count, lang } = req.body;
    const result = await pool.query(
      `INSERT INTO search_logs(user_id,query,mandatory_count,unspsc_count,hs_count,lang) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, query, mandatory_count||0, unspsc_count||0, hs_count||0, lang||'ar']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/entities/SearchLog/list', requireAuth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const result = await pool.query(
      `SELECT * FROM search_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/entities/SearchLog/:id', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM search_logs WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
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

// ─── Translation Route ────────────────────────────────────────────────────────
app.post('/api/translate', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || query.trim().length < 2) return res.json({ original: query, translated: '' });
    const isArabic = /[\u0600-\u06FF]/.test(query);
    const prompt = isArabic
      ? `Translate this Arabic product/item term to English. Return ONLY the English translation, no explanation, no punctuation, just the translated word(s): "${query}"`
      : `ترجم هذا المصطلح/المنتج من الإنجليزية إلى العربية. أرجع الترجمة العربية فقط بدون أي شرح أو علامات ترقيم: "${query}"`;
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });
    res.json({ original: query.trim(), translated: message.content[0].text.trim() });
  } catch (e) {
    res.json({ original: req.body.query, translated: '' });
  }
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

// ─── Serve frontend ────────────────────────────────────────────────────────────
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')));

// ─── Helpers ───────────────────────────────────────────────────────────────────
function extractTerms(orArray) {
  const terms = new Set();
  for (const cond of orArray) {
    const val = Object.values(cond)[0];
    if (val?.$regex) terms.add(val.$regex);
  }
  return [...terms];
}

// ─── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));
});
