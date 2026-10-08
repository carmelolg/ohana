/** «Cane, gatto; veterinario» → parole chiave minuscole, senza vuoti né doppioni. */
export function parseKeywords(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,;\n]/)
        .map((word) => word.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export const sameKeywords = (a: string[], b: string[]): boolean => a.join() === b.join();
