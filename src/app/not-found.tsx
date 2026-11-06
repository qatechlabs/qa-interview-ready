import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-2 muted">That question or page doesn't exist.</p>
      <Link href="/" className="btn btn-primary mt-6">Go home</Link>
    </div>
  );
}
