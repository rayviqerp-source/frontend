/**
 * Deterministic portrait photos for engineers.
 *
 * Priority:
 *  1. local file shipped in `public/photos/` (works offline — ENG-01 … ENG-10),
 *  2. remote portrait (i.pravatar.cc) for engineers added later,
 *  3. the coloured initials badge (rendered by the avatar component underneath).
 */

const LOCAL_PHOTOS: Record<string, string> = {
  "ENG-01": "/photos/eng-01.jpg",
  "ENG-02": "/photos/eng-02.jpg",
  "ENG-03": "/photos/eng-03.jpg",
  "ENG-04": "/photos/eng-04.jpg",
  "ENG-05": "/photos/eng-05.jpg",
  "ENG-06": "/photos/eng-06.jpg",
  "ENG-07": "/photos/eng-07.jpg",
  "ENG-08": "/photos/eng-08.jpg",
  "ENG-09": "/photos/eng-09.jpg",
  "ENG-10": "/photos/eng-10.jpg",
};

/** Local photo for an engineer id, or null when none is bundled. */
export function localPhoto(id: string): string | null {
  return LOCAL_PHOTOS[id.trim().toUpperCase()] ?? null;
}

/** Remote portrait for an engineer id (deterministic per id). */
export function remotePhoto(id: string): string {
  const digits = id.replace(/\D/g, "");
  const n = digits ? Number.parseInt(digits, 10) : 0;
  const idx = ((n * 13) % 70) + 1;
  return `https://i.pravatar.cc/150?img=${idx}`;
}
