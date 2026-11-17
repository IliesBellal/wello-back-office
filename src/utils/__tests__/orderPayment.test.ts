import { describe, expect, it } from 'vitest';
import { getPaidAmount, getPendingCollection } from '../orderPayment';

const payment = (amount: number, enabled: boolean | number = true) => ({ amount, enabled });

describe('getPaidAmount', () => {
  it('ignore les paiements annulés', () => {
    expect(getPaidAmount([payment(1000), payment(500, false), payment(200, 0)])).toBe(1000);
  });

  it('tolère une liste absente', () => {
    expect(getPaidAmount(undefined)).toBe(0);
    expect(getPaidAmount(null)).toBe(0);
  });
});

describe('getPendingCollection', () => {
  it('renvoie null sans paiement annoncé', () => {
    expect(getPendingCollection({ TTC: 2350, payments: [] })).toBeNull();
    expect(getPendingCollection({ TTC: 2350, payments: [], expected_payment: null })).toBeNull();
  });

  it('renvoie le reste à encaisser et le moyen annoncé', () => {
    expect(
      getPendingCollection({
        TTC: 2350,
        payments: [],
        expected_payment: { mop: 'CB', tender_amount: null },
      }),
    ).toEqual({ mop: 'CB', amount: 2350, tenderAmount: null, changeDue: null });
  });

  it('calcule la monnaie à rendre en espèces', () => {
    expect(
      getPendingCollection({
        TTC: 2350,
        payments: [],
        expected_payment: { mop: 'ES', tender_amount: 5000 },
      }),
    ).toEqual({ mop: 'ES', amount: 2350, tenderAmount: 5000, changeDue: 2650 });
  });

  it('ne rend rien quand le client donne l’appoint ou moins que le reste', () => {
    const order = { TTC: 2350, payments: [], expected_payment: { mop: 'ES', tender_amount: 2350 } };
    expect(getPendingCollection(order)?.changeDue).toBeNull();
  });

  it('déduit les paiements déjà encaissés du reste', () => {
    const result = getPendingCollection({
      TTC: 2350,
      payments: [payment(1000), payment(300, false)],
      expected_payment: { mop: 'ES', tender_amount: 2000 },
    });
    expect(result?.amount).toBe(1350);
    expect(result?.changeDue).toBe(650);
  });

  it('renvoie null une fois la commande soldée, annonce conservée ou non', () => {
    expect(
      getPendingCollection({
        TTC: 2350,
        payments: [payment(2350)],
        expected_payment: { mop: 'ES', tender_amount: 5000 },
      }),
    ).toBeNull();
  });

  it('renvoie null sur une commande annulée ou refusée', () => {
    for (const brand_status of ['CANCELED', 'DENIED', 'DELETED']) {
      expect(
        getPendingCollection({
          TTC: 2350,
          payments: [],
          brand_status,
          expected_payment: { mop: 'CB', tender_amount: null },
        }),
      ).toBeNull();
    }
  });
});
