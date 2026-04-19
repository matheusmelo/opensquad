const Fuse = require('fuse.js');

class FuzzyMatcher {
  constructor() {
    this.fuse = null;
    this.categories = [];
    this.init();
  }

  init() {
    this.categories = [
      { name: 'Transporte', aliases: ['uber', '99', 'taxi', 'cabify', 'transporte', 'estacionamento', 'combustivel', 'gasolina', 'pedagio'] },
      { name: 'Moradia', aliases: ['condominio', 'sindico', 'aluguel', 'iptu', 'agua', 'luz', 'energia', 'internet', 'telefone'] },
      { name: 'Alimentação', aliases: ['supermercado', 'carrefour', 'assai', 'pao de acucar', 'dia', 'mercado', 'hortifruti'] },
      { name: 'Lazer/Assinaturas', aliases: ['netflix', 'spotify', 'hbo', 'disney', 'prime', 'globo', 'assinatura', 'streaming'] },
      { name: 'Alimentação fora', aliases: ['ifood', 'rappi', 'uber eats', 'restaurante', 'lanchonete', 'bar', 'pizza'] },
      { name: 'Compras', aliases: ['amazon', 'magazine luiza', 'shopee', 'mercado livre', 'compra', 'loja'] },
      { name: 'Infra cloud', aliases: ['aws', 'cloudflare', 'digital ocean', 'vultr', 'hetzner', 'server'] },
      { name: 'Marketing digital', aliases: ['facebook', 'meta ads', 'google ads', 'linkedin ads', 'anuncio', 'publicidade'] },
    ];

    const options = {
      includeScore: true,
      threshold: 0.3,
      keys: ['aliases']
    };

    this.fuse = new Fuse(this.categories, options);
  }

  match(description) {
    if (!description || description.trim().length === 0) {
      return null;
    }

    const results = this.fuse.search(description.toLowerCase());

    if (results.length === 0) {
      return null;
    }

    const bestMatch = results[0];
    const confidence = 1 - bestMatch.score;

    return {
      categoria: bestMatch.item.name,
      confianca: confidence,
      matchStrategy: 'fuzzy'
    };
  }

  getTopMatches(description, limit = 3) {
    if (!description || description.trim().length === 0) {
      return [];
    }

    const results = this.fuse.search(description.toLowerCase(), { limit });

    return results.map(r => ({
      categoria: r.item.name,
      confianca: 1 - r.score,
      matchStrategy: 'fuzzy'
    }));
  }
}

module.exports = FuzzyMatcher;
