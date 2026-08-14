/**
 * Tests de `customerImportDecisions` (spec exécutable, style vitest — comme
 * `src/services/__tests__/*.test.ts`).
 */

import { describe, expect, it } from 'vitest';

import {
  allowedResolutions,
  buildCommitDecisions,
  defaultResolution,
  defaultResolutions,
  effectiveResolution,
  indexBlockersByRef,
  matchedByLabel,
  summarize,
} from './customerImportDecisions';
import type { CustomerImportResolution, CustomerImportRow, CustomerImportRowStatus } from '@/types/customerImport';

const row = (over: Partial<CustomerImportRow> & Pick<CustomerImportRow, 'external_id' | 'status'>): CustomerImportRow => ({
  source_line: 1,
  display_name: 'Jean Dupont',
  resolution: defaultResolution(over),
  ...over,
});

describe('defaultResolution', () => {
  const cases: [CustomerImportRowStatus, CustomerImportResolution][] = [
    ['create', 'create'],
    ['already_imported', 'skip'],
    ['mapping_stale', 'recreate'],
    ['duplicate', 'skip'],
    ['conflict', 'skip'],
  ];

  it.each(cases)('statut %s -> défaut %s', (status, expected) => {
    expect(defaultResolution({ status })).toBe(expected);
  });
});

describe('allowedResolutions', () => {
  it('create : aucun choix, uniquement create', () => {
    expect(allowedResolutions({ status: 'create' })).toEqual(['create']);
  });

  it('duplicate : ignorer, mettre à jour, importer quand même', () => {
    expect(allowedResolutions({ status: 'duplicate' })).toEqual(['skip', 'update', 'import_anyway']);
  });

  it('conflict : ignorer, rattacher email, rattacher téléphone, importer quand même', () => {
    expect(allowedResolutions({ status: 'conflict' })).toEqual([
      'skip',
      'update_to_email',
      'update_to_phone',
      'import_anyway',
    ]);
  });

  it('already_imported : ignorer ou recréer', () => {
    expect(allowedResolutions({ status: 'already_imported' })).toEqual(['skip', 'recreate']);
  });

  it('mapping_stale : ignorer ou recréer', () => {
    expect(allowedResolutions({ status: 'mapping_stale' })).toEqual(['skip', 'recreate']);
  });

  it('chaque défaut fait partie de ses propres choix autorisés', () => {
    const statuses: CustomerImportRowStatus[] = [
      'create',
      'already_imported',
      'mapping_stale',
      'duplicate',
      'conflict',
    ];
    for (const status of statuses) {
      expect(allowedResolutions({ status })).toContain(defaultResolution({ status }));
    }
  });
});

describe('matchedByLabel', () => {
  it('traduit chaque valeur', () => {
    expect(matchedByLabel('email')).toBe('email');
    expect(matchedByLabel('phone')).toBe('téléphone');
    expect(matchedByLabel('both')).toBe('email et téléphone');
    expect(matchedByLabel(undefined)).toBe('email ou téléphone');
  });
});

describe('effectiveResolution / defaultResolutions', () => {
  it('utilise la résolution choisie quand elle existe', () => {
    const r = row({ external_id: 'Z1', status: 'duplicate' });
    expect(effectiveResolution(r, { Z1: 'update' })).toBe('update');
  });

  it('retombe sur le défaut du statut si aucune décision n’a été prise', () => {
    const r = row({ external_id: 'Z1', status: 'mapping_stale' });
    expect(effectiveResolution(r, {})).toBe('recreate');
  });

  it('defaultResolutions initialise une entrée par ligne', () => {
    const rows = [
      row({ external_id: 'Z1', status: 'create' }),
      row({ external_id: 'Z2', status: 'already_imported' }),
    ];
    expect(defaultResolutions(rows)).toEqual({ Z1: 'create', Z2: 'skip' });
  });
});

describe('summarize', () => {
  it('compte chaque action réelle sur un mix de statuts', () => {
    const rows = [
      row({ external_id: 'create-1', status: 'create' }),
      row({ external_id: 'create-2', status: 'create' }),
      row({ external_id: 'dup-skip', status: 'duplicate' }),
      row({ external_id: 'dup-update', status: 'duplicate' }),
      row({ external_id: 'dup-anyway', status: 'duplicate' }),
      row({ external_id: 'conflict-email', status: 'conflict' }),
      row({ external_id: 'conflict-phone', status: 'conflict' }),
      row({ external_id: 'already-skip', status: 'already_imported' }),
      row({ external_id: 'stale-recreate', status: 'mapping_stale' }),
    ];

    const resolutions: Record<string, CustomerImportResolution> = {
      'dup-update': 'update',
      'dup-anyway': 'import_anyway',
      'conflict-email': 'update_to_email',
      'conflict-phone': 'update_to_phone',
    };

    const summary = summarize(rows, resolutions);

    // create-1, create-2 (défaut create), dup-anyway (import_anyway)
    expect(summary.toCreate).toBe(3);
    // dup-update (update), conflict-email, conflict-phone
    expect(summary.toUpdate).toBe(3);
    // stale-recreate (défaut recreate)
    expect(summary.toRecreate).toBe(1);
    // dup-skip, already-skip (défauts skip)
    expect(summary.skipped).toBe(2);
    expect(summary.totalToImport).toBe(7);
  });

  it('lot vide', () => {
    expect(summarize([], {})).toEqual({
      toCreate: 0,
      toUpdate: 0,
      toRecreate: 0,
      skipped: 0,
      totalToImport: 0,
    });
  });
});

describe('indexBlockersByRef', () => {
  it('indexe par ref, ignore les blocages globaux sans ref', () => {
    const byRef = indexBlockersByRef([
      { code: 'invalid_update_target', ref: 'Z1', message: 'cible disparue' },
      { code: 'invalid_decision', ref: 'Z2', message: 'résolution incohérente' },
      { code: 'unknown_decision', message: 'décision globale' },
    ]);

    expect(byRef.size).toBe(2);
    expect(byRef.get('Z1')?.message).toBe('cible disparue');
    expect(byRef.get('Z2')?.code).toBe('invalid_decision');
    expect(byRef.has('Z3')).toBe(false);
  });

  it('liste vide', () => {
    expect(indexBlockersByRef([]).size).toBe(0);
  });
});

describe('buildCommitDecisions', () => {
  it('ne porte que les lignes dont la résolution diverge du défaut', () => {
    const rows = [
      row({ external_id: 'Z1', status: 'create' }), // reste au défaut
      row({ external_id: 'Z2', status: 'duplicate' }), // passe à update
      row({ external_id: 'Z3', status: 'mapping_stale' }), // reste au défaut (recreate)
      row({ external_id: 'Z4', status: 'conflict' }), // passe à skip (déjà le défaut en réalité)
    ];
    const resolutions: Record<string, CustomerImportResolution> = {
      Z1: 'create',
      Z2: 'update',
      Z3: 'recreate',
      Z4: 'skip',
    };

    const decisions = buildCommitDecisions(rows, resolutions);

    expect(decisions).toEqual([{ external_id: 'Z2', resolution: 'update' }]);
  });

  it('lot entièrement par défaut -> tableau vide', () => {
    const rows = [row({ external_id: 'Z1', status: 'create' }), row({ external_id: 'Z2', status: 'duplicate' })];
    expect(buildCommitDecisions(rows, defaultResolutions(rows))).toEqual([]);
  });
});
