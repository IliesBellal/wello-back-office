import { describe, expect, it } from 'vitest';

import { seoErrorMessage } from './scannorderSeoService';

const httpError = (status: number, body: unknown) =>
  Object.assign(new Error(`HTTP error ${status}`), { name: 'ApiHttpError', status, responseBody: body });

describe('seoErrorMessage', () => {
  it('désigne le champ refusé et la saisie fautive', () => {
    expect(seoErrorMessage(httpError(400, { error: 'invalid_field', field: 'links', reason: 'invalid_link', value: 'pas un lien' })))
      .toBe("Ce lien n'est pas une adresse web valide : « pas un lien »");
    expect(seoErrorMessage(httpError(400, { error: 'invalid_field', field: 'cuisine_types', reason: 'too_many' })))
      .toBe('Choisissez au plus 3 types de cuisine.');
  });

  it('erreurs de suggestion, enveloppe { id, data } comprise', () => {
    expect(seoErrorMessage(httpError(422, { id: 'x', data: { error: 'menu_too_small' } })))
      .toContain('trop peu de produits');
    expect(seoErrorMessage(httpError(429, 'Too Many Requests'))).toContain('Trop de demandes');
    expect(seoErrorMessage(httpError(503, { error: 'google_search_unavailable' }))).toContain('collez les liens');
    expect(seoErrorMessage(httpError(400, { error: 'invalid_field', field: 'review_request_enabled', reason: 'missing_review_url' })))
      .toBe("Renseignez d'abord le lien pour laisser un avis.");
  });

  it('erreur inconnue : message générique', () => {
    expect(seoErrorMessage(new Error('réseau'))).toBe('Une erreur est survenue. Réessayez dans un instant.');
  });
});
