import { describe, expect, it } from "vitest";
import {
  accountBalanceKind,
  accountCustomerName,
  accountEntryLabel,
  agingToCsv,
  type CustomerAccountEntry,
} from "@/services/customerAccountsService";

describe("compte client : libellés", () => {
  it("nature du solde", () => {
    expect(accountBalanceKind(1200)).toBe("Avance");
    expect(accountBalanceKind(-50)).toBe("Ardoise");
    expect(accountBalanceKind(0)).toBe("Soldé");
  });

  it("ligne de mouvement", () => {
    const deposit: CustomerAccountEntry = {
      kind: "operation",
      date: 1,
      delta: 5000,
      balance_after: 5000,
      operation: { operation_id: 1, operation_type: "DEPOSIT", amount: 5000, mop: "CB", comment: null, operation_date: 1 },
    };
    expect(accountEntryLabel(deposit)).toBe("Versement · Carte bancaire");

    const writeOff: CustomerAccountEntry = {
      kind: "operation",
      date: 2,
      delta: 300,
      balance_after: 0,
      operation: { operation_id: 2, operation_type: "WRITE_OFF", amount: 300, mop: null, comment: "Client parti", operation_date: 2 },
    };
    expect(accountEntryLabel(writeOff)).toBe("Abandon de créance");
  });

  it("commande réglée ou remboursée sur le compte", () => {
    const base = { kind: "payment" as const, date: 3, balance_after: 0 };
    const payment = { payment_id: 9, order_id: 9001, order_num: "42", amount: 2350, payment_date: 3 };
    expect(accountEntryLabel({ ...base, delta: -2350, payment })).toBe("Commande 42");
    expect(accountEntryLabel({ ...base, delta: 2350, payment: { ...payment, amount: -2350 } })).toBe(
      "Commande 42 remboursée sur le compte",
    );
  });

  it("balance âgée en CSV", () => {
    const csv = agingToCsv([
      {
        customer: { customer_id: 7, first_name: "Jean", last_name: "Dupont", business_name: "", phone: "0600000000", balance: -12345, last_movement: 0 },
        debt: 12345,
        days_0_30: 2345,
        days_31_60: 0,
        days_61_plus: 10000,
        oldest_unpaid: 0,
      },
    ]);
    const [header, line] = csv.split("\r\n");
    expect(header.split(";")).toHaveLength(7);
    expect(line).toBe('"Jean Dupont";"0600000000";"";"123,45";"23,45";"0,00";"100,00"');
  });

  it("nom du client", () => {
    expect(accountCustomerName({ first_name: "Jean", last_name: "Dupont", business_name: "" })).toBe("Jean Dupont");
    expect(accountCustomerName({ first_name: "", last_name: "", business_name: "SARL Midi" })).toBe("SARL Midi");
    expect(accountCustomerName({ first_name: "", last_name: "", business_name: "" })).toBe("Client sans nom");
  });
});
