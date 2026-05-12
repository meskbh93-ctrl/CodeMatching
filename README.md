# ClassiMatch Pro — نسخة Coolify

تم تحويل التطبيق من base44 إلى كود مستقل يعمل على أي سيرفر.

## التغييرات
| قبل (base44) | بعد |
|---|---|
| @base44/sdk | Express.js + PostgreSQL |
| base44.entities.X | API routes على /api/entities/X |
| base44.integrations.Core.InvokeLLM | Anthropic API مباشرة |
| @base44/vite-plugin | @vitejs/plugin-react عادي |

## الرفع على Coolify

1. أضف مشروع → Build Pack: Dockerfile → Port: 3000
2. أضف قاعدة بيانات PostgreSQL
3. متغيرات البيئة:
   DATABASE_URL=postgresql://...
   ANTHROPIC_API_KEY=sk-ant-...
   IMPORT_SECRET=كلمة-سر-عشوائية
4. ارفع الكود وادفع Deploy

## استيراد البيانات من base44

BASE44_APP_ID=xxx BASE44_TOKEN=yyy TARGET_URL=https://your-app.coolify.io IMPORT_SECRET=zzz node scripts/import-data.mjs
