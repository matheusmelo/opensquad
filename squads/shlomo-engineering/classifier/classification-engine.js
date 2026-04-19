const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { PrismaClient } = require('@prisma/client');
const { logEvent } = require('../../../orchestrator/services/activity-logger');
const FuzzyMatcher = require('./fuzzy-matcher');

const prisma = new PrismaClient();
const fuzzyMatcher = new FuzzyMatcher();

class ClassificationEngine {
  constructor() {
    this.rules = [];
    this.loadRules();
  }

  /**
   * Load classification rules from YAML and database
   */
  loadRules() {
    try {
      // Load YAML rules
      const yamlPath = path.join(__dirname, 'rules.yaml');
      if (fs.existsSync(yamlPath)) {
        const yamlRules = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
        this.rules = yamlRules.rules || [];
      }

      // TODO: Merge with database rules when available
      console.log(`Loaded ${this.rules.length} classification rules`);
    } catch (error) {
      console.error('Error loading classification rules:', error);
      this.rules = [];
    }
  }

  /**
   * Classify a single transaction
   * @param {Object} transaction - Transaction to classify
   * @param {string} userId - User ID for context
   * @returns {Object} Classification result
   */
  classifyTransaction(transaction, userId) {
    const description = transaction.description || '';
    const lowerDesc = description.toLowerCase();

    let bestMatch = null;
    let bestScore = 0;
    let matchedRule = null;
    let matchStrategy = 'fallback';

    // 1. PRIORIDADE 1: Regex exato das regras
    for (const rule of this.rules) {
      const score = this.calculateMatchScore(lowerDesc, rule.pattern);

      if (score > bestScore && score >= (rule.confiancaMinima || 0.7)) {
        bestScore = score;
        bestMatch = rule;
        matchedRule = {
          id: rule.pattern,
          pattern: rule.pattern,
          source: rule.source || 'yaml'
        };
        matchStrategy = 'regex';
      }
    }

    if (bestMatch) {
      return {
        contexto: bestMatch.contexto,
        pulmao: bestMatch.pulmao,
        categoria: bestMatch.categoria,
        confianca: bestScore,
        matchedRule,
        matchStrategy
      };
    }

    // 2. PRIORIDADE 2: Fuzzy matching
    const fuzzyResult = fuzzyMatcher.match(description);
    if (fuzzyResult && fuzzyResult.confianca > 0.6) {
      let pulmao = 3;
      if (['Transporte', 'Moradia', 'Alimentação'].includes(fuzzyResult.categoria)) {
        pulmao = 1;
      } else if (['Lazer/Assinaturas', 'Alimentação fora'].includes(fuzzyResult.categoria)) {
        pulmao = 2;
      }

      return {
        contexto: 'PF',
        pulmao,
        categoria: fuzzyResult.categoria,
        confianca: fuzzyResult.confianca,
        matchedRule: null,
        matchStrategy: fuzzyResult.matchStrategy
      };
    }

    // 3. PRIORIDADE 3: Heurística por valor
    if (transaction.amount) {
      if (transaction.amount > 1000) {
        return {
          contexto: 'PF',
          pulmao: 1,
          categoria: 'Gasto Alto',
          confianca: 0.5,
          matchedRule: null,
          matchStrategy: 'heuristic'
        };
      } else if (transaction.amount < 50) {
        return {
          contexto: 'PF',
          pulmao: 2,
          categoria: 'Gasto Pequeno',
          confianca: 0.4,
          matchedRule: null,
          matchStrategy: 'heuristic'
        };
      }
    }

    // 4. Fallback final
    return {
      contexto: transaction.type === 'credit' ? 'PF' : 'PF',
      pulmao: 3,
      categoria: 'Outros',
      confianca: 0.0,
      matchedRule: null,
      matchStrategy: 'fallback'
    };
  }

  getClassificationPreview(description) {
    return fuzzyMatcher.getTopMatches(description, 3);
  }

  /**
   * Classify multiple transactions
   * @param {Array} transactions - Array of transactions
   * @param {string} userId - User ID
   * @returns {Array} Classified transactions
   */
  async classifyBatch(transactions, userId) {
    const startTime = Date.now();

    // Log start
    await logEvent({
      type: 'TASK_STARTED',
      squadId: 'shlomo-engineering',
      agentId: 'classification-engine',
      payload: {
        message: `Starting classification of ${transactions.length} transactions`,
        taskType: 'classification'
      }
    });

    const classified = transactions.map(tx => ({
      ...tx,
      classification: this.classifyTransaction(tx, userId)
    }));

    const duration = Date.now() - startTime;

    // Log completion
    await logEvent({
      type: 'TASK_COMPLETED',
      squadId: 'shlomo-engineering',
      agentId: 'classification-engine',
      payload: {
        message: `Classification completed: ${classified.length} transactions processed`,
        durationMs: duration,
        taskType: 'classification'
      }
    });

    return classified;
  }

  /**
   * Calculate match score between description and pattern
   * @param {string} description - Transaction description
   * @param {string} pattern - Regex pattern
   * @returns {number} Match score (0.0 to 1.0)
   */
  calculateMatchScore(description, pattern) {
    try {
      const regex = new RegExp(pattern, 'i');
      const matches = description.match(regex);

      if (!matches) return 0.0;

      // Exact word match gets highest score
      const words = pattern.split(/[\s|]+/).filter(w => w.length > 0);
      const matchedWords = words.filter(word =>
        new RegExp(`\\b${word}\\b`, 'i').test(description)
      );

      const wordMatchRatio = matchedWords.length / words.length;

      // Length-based bonus (longer patterns are more specific)
      const lengthBonus = Math.min(pattern.length / 50, 0.2);

      return Math.min(wordMatchRatio + lengthBonus, 1.0);
    } catch (error) {
      console.error('Error calculating match score:', error);
      return 0.0;
    }
  }

  /**
   * Save a new rule to database
   * @param {Object} rule - Rule object
   */
  async saveRule(rule) {
    try {
      await prisma.classificationRule.create({
        data: {
          pattern: rule.pattern,
          contexto: rule.contexto,
          pulmao: rule.pulmao,
          categoria: rule.categoria,
          createdAt: new Date(),
        }
      });

      // Reload rules
      this.loadRules();

      await logEvent({
        type: 'MESSAGE',
        squadId: 'shlomo-engineering',
        agentId: 'classification-engine',
        payload: {
          message: `New classification rule saved: ${rule.pattern}`,
          toolName: 'rule_learner'
        }
      });

    } catch (error) {
      console.error('Error saving rule:', error);
      throw error;
    }
  }
}

module.exports = ClassificationEngine;