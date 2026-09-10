/**
 * Executa `fn` sobre `items` com no maximo `limit` chamadas em voo ao mesmo
 * tempo. Preserva a ordem dos resultados. Usado pelo job de sync para nao
 * martelar a Steam. Puro (nao faz I/O proprio).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const size = Math.max(1, Math.trunc(limit));
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(size, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
