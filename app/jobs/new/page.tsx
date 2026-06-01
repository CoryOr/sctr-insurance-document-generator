//app/jobs/new/page.tsx
import Link from "next/link";
import UploadTrama from "./UploadTrama";

type SP = Record<string, string | string[] | undefined>;

export default async function NewJobPage({
  searchParams,
}: {
  searchParams?: SP | Promise<SP>;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const insurerParam = sp.insurer;
  const insurer = Array.isArray(insurerParam)
    ? insurerParam[0]
    : insurerParam ?? "unknown";

  return (
    <main className="px-6 py-8 font-sans">
      <Link href="/" className="text-zinc-300 hover:text-zinc-50">
        ← Back
      </Link>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
        New SCTR Job
      </h1>

      <p className="mt-2 text-zinc-400">
        Selected insurer: <span className="font-semibold text-zinc-200">{insurer}</span>
      </p>

      <UploadTrama insurer={insurer} />

    </main>
  );
}

