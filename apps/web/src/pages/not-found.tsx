import { Link } from "wouter";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-4">Page not found</p>
        <Link href="/">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Go home</button>
        </Link>
      </div>
    </div>
  );
}
