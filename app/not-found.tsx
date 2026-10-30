import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-muted">This page or record does not exist. It may have been deleted.</p>
      <Link href="/" className="mt-4 inline-block text-accent hover:text-accent-hover">Back to the pipeline</Link>
    </div>
  );
}
