/**
 * Estratégias puras e determinísticas de balanceamento de tráfego
 * Utilizadas tanto no motor em produção quanto no simulador e testes unitários
 */

export interface WeightedItem {
  id: string;
  weight: number;
}

/**
 * Seleção aleatória pura
 */
export function selectRandom<T>(items: T[]): T | null {
  if (!items || items.length === 0) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

/**
 * Seleção ponderada (Weighted Distribution)
 * Considera a soma dos pesos e escolhe proporcionalmente.
 */
export function selectByWeight<T extends WeightedItem>(items: T[]): T | null {
  if (!items || items.length === 0) return null;

  // Garante que pesos inválidos ou negativos sejam tratados como 0
  const validWeights = items.map((item) => Math.max(0, item.weight || 0));
  const totalWeight = validWeights.reduce((acc, curr) => acc + curr, 0);

  // Se todos os pesos forem 0, recorre ao sorteio uniforme
  if (totalWeight <= 0) {
    return selectRandom(items);
  }

  let randomPoint = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    const weight = validWeights[i];
    if (randomPoint < weight) {
      return items[i];
    }
    randomPoint -= weight;
  }

  return items[items.length - 1];
}

/**
 * Seleção Round Robin baseada em índice
 * Dado o último índice utilizado e a lista, retorna o próximo item e o novo índice.
 */
export function selectByRoundRobin<T>(items: T[], lastIndex: number = -1): { item: T; nextIndex: number } | null {
  if (!items || items.length === 0) return null;
  const nextIndex = (lastIndex + 1) % items.length;
  return {
    item: items[nextIndex],
    nextIndex,
  };
}

/**
 * Simulador de distribuição para testar N acessos
 */
export function simulateDistribution<T extends WeightedItem>(
  items: T[],
  strategy: 'round_robin' | 'random' | 'weighted',
  totalRuns: number = 1000
): Record<string, { count: number; percentage: number }> {
  const result: Record<string, { count: number; percentage: number }> = {};
  if (!items || items.length === 0) return result;

  items.forEach((item) => {
    result[item.id] = { count: 0, percentage: 0 };
  });

  let rrIndex = -1;

  for (let i = 0; i < totalRuns; i++) {
    let chosen: T | null = null;
    if (strategy === 'weighted') {
      chosen = selectByWeight(items);
    } else if (strategy === 'random') {
      chosen = selectRandom(items);
    } else if (strategy === 'round_robin') {
      const rr = selectByRoundRobin(items, rrIndex);
      if (rr) {
        chosen = rr.item;
        rrIndex = rr.nextIndex;
      }
    }

    if (chosen && result[chosen.id]) {
      result[chosen.id].count += 1;
    }
  }

  for (const id in result) {
    result[id].percentage = Math.round((result[id].count / totalRuns) * 1000) / 10;
  }

  return result;
}
