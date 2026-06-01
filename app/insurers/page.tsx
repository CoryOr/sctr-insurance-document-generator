// app/api/insurer/page.tsx
import Link from "next/link";
import Image from "next/image";

type InsurerCard = {
  key: string;
  alt: string;
  logos: { src: string; w: number; h: number }[];
};

export default function Home() {
  const insurers: InsurerCard[] = [
    { key: "rimac", alt: "Rímac", logos: [{ src: "/pdf-assets/logos/rimac.png", w: 220, h: 90 }] },
    { key: "lapositiva", alt: "La Positiva", logos: [{ src: "/pdf-assets/logos/lapositiva.png", w: 240, h: 90 }] },
    { key: "mapfre", alt: "MAPFRE", logos: [{ src: "/pdf-assets/logos/mapfre_peru.png", w: 260, h: 90 }] },
  ];

  return (
    <main className="px-6 py-10 font-sans">
      <h1 className="text-3xl font-extrabold tracking-tight">SCTR — Generador interno</h1>
      <p className="mt-2 text-zinc-400">Selecciona la aseguradora para empezar.</p>

      <div className="mt-65 flex justify-center">
        <div className="grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {insurers.map((i) => (
            <Link
              key={i.key}
              href={`/jobs/new?insurer=${i.key}`}
              aria-label={i.alt}
              className="
                group
                rounded-3xl border border-zinc-800 bg-zinc-900/60
                px-8 py-10
                shadow-sm transition
                hover:border-zinc-700 hover:bg-zinc-900
                flex items-center justify-center
              "
            >
              <div className="flex items-center justify-center gap-10">
                {i.logos.map((l) => (
                  <div
                    key={l.src}
                    className="relative h-20 w-[260px] sm:h-24 sm:w-[300px]"
                  >
                    <Image
                      src={l.src}
                      alt={i.alt}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                ))}
              </div>

              <span className="sr-only">{i.alt}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
