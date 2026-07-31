import { TAXONOMY_RULES } from './taxonomy';

describe('Taxonomy Rules', () => {
  it('should validate all required prefixes', () => {
    const requiredPrefixes = [
      '⭐ [FAVORITOS]',
      '🎸 [GÊNERO / ESTILO]',
      '🧠 [FOCO / TRABALHO]',
      '🚗 [ROADTRIP / VIAGEM]',
      '📦 [ARQUIVO]',
      '🧹 [LIXEIRA / REPETIDAS]',
    ];

    const actualPrefixes = TAXONOMY_RULES.map(r => r.prefix);
    requiredPrefixes.forEach(prefix => {
      expect(actualPrefixes).toContain(prefix);
    });
  });

  it('should provide a description for each rule', () => {
    TAXONOMY_RULES.forEach(rule => {
      expect(rule.description).toBeTruthy();
    });
  });

  it('should compile regex patterns', () => {
    TAXONOMY_RULES.forEach(rule => {
      expect(rule.regex).toBeInstanceOf(RegExp);
    });
  });
});
