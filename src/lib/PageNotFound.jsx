import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';

export default function PageNotFound() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="text-6xl">🔍</div>
      <h1 className="text-3xl font-bold text-slate-800">الصفحة غير موجودة</h1>
      <p className="text-slate-500 max-w-sm">
        المسار <code className="bg-slate-100 px-2 py-1 rounded">{location.pathname}</code> غير موجود.
      </p>
      <Link to="/" className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
        الرئيسية
      </Link>
    </div>
  );
}
