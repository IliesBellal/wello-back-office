import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntityMatch, ModelIntent } from '@/lib/assistant/types';

const getOrderHistory = vi.fn();
vi.mock('@/services/analyticsService', () => ({ analyticsService: { getOrderHistory: (...a: unknown[]) => getOrderHistory(...a) } }));

const { ACTIONS } = await import('../actions');

const order = (id: string, num: number, date: string) => ({
  id, number: `#${num}`, date, time: '12:30', customer_name: '—', brand: 'WELLO_RESTO', order_type: 'IN', status: 'done', total: 20, payment_method: 'card',
});
const number = (n: number): EntityMatch => ({ type: 'number', text: String(n), start: 3, end: 4, score: 1, quantity: n });
const run = (slots: Record<string, EntityMatch>) => {
  const navigate = vi.fn();
  const openPage = vi.fn();
  const res = ACTIONS['order.open']({} as ModelIntent, slots, { navigate, openPage } as never);
  return { res, navigate, openPage };
};

describe('ouvrir une commande (numéros de 0 à 99)', () => {
  beforeEach(() => getOrderHistory.mockReset());

  it('sans date : ouvre la plus récente et propose les précédentes', async () => {
    getOrderHistory.mockResolvedValue({ orders: [order('900', 42, '11/11/2026'), order('800', 42, '10/11/2026'), order('700', 42, '09/11/2026')] });
    const { res, navigate } = run({ number: number(42) });
    const r = await res;
    expect(getOrderHistory.mock.calls[0][8]).toEqual({ orderNum: 42 });
    expect(getOrderHistory.mock.calls[0][7]).toBe(5);
    expect(navigate.mock.calls[0][0]).toContain('orderId=900');
    expect(r.close).toBe('mobile');
    const list = r.blocks.find((b) => b.type === 'list') as { items: Array<{ id: string }> };
    expect(list.items.map((i) => i.id)).toEqual(['800', '700']);
  });

  it('avec une date : cherche ce jour-là seulement', async () => {
    getOrderHistory.mockResolvedValue({ orders: [order('555', 64, '22/06/2026')] });
    const period: EntityMatch = { type: 'date', text: '22 juin', start: 5, end: 7, score: 1, date: { from: '2026-06-22', to: '2026-06-22', label: 'le 22 juin', grain: 'day' } };
    const { res, navigate } = run({ number: number(64), period });
    const r = await res;
    const [from, to] = getOrderHistory.mock.calls[0] as [Date, Date];
    expect([from.getDate(), from.getMonth(), to.getDate()]).toEqual([22, 5, 22]);
    expect(navigate.mock.calls[0][0]).toContain('orderId=555');
    expect(r.close).toBe('always');
  });

  it("n'ouvre jamais un autre numéro (API sans filtre order_num)", async () => {
    getOrderHistory.mockResolvedValue({ orders: [order('1', 7, '11/11/2026'), order('2', 17, '11/11/2026')] });
    const { res, navigate } = run({ number: number(42) });
    const r = await res;
    expect(navigate).not.toHaveBeenCalled();
    expect(JSON.stringify(r.blocks)).toContain('Je ne trouve pas de commande #42');
  });

  it('un grand nombre est un identifiant de commande', async () => {
    getOrderHistory.mockResolvedValue({ orders: [order('42098', 12, '11/11/2026')] });
    const { res, navigate } = run({ number: number(42098) });
    await res;
    expect(getOrderHistory.mock.calls[0][5]).toBe('42098');
    expect(navigate.mock.calls[0][0]).toContain('orderId=42098');
  });
});
