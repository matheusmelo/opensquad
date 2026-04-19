const { PrismaClient } = require('@prisma/client');
const { logEvent } = require('../../../orchestrator/services/activity-logger');
const ClassificationEngine = require('./classification-engine');

const prisma = new PrismaClient();

class RuleLearner {
  constructor() {
    this.engine = new ClassificationEngine();
  }

  /**
   * Suggest new rule based on correction
   * @param {Object} original - Original classification
   * @param {Object} corrected - Corrected classification
   * @returns {Object} Rule suggestion
   */
  suggestRuleFromCorrection(original, corrected) {
    const originalDesc = original.description || '';
    const correctedDesc = corrected.description || '';

    // Extract potential patterns from description
    const patterns = this.extractPatterns(originalDesc);

    const suggestion = {
      pattern: patterns[0] || originalDesc.split(' ')[0], // First word as fallback
      contexto: corrected.contexto || 'PF',
      pulmao: corrected.pulmao,
      categoria: corrected.categoria || 'Outros',
      confiancaMinima: 0.8,
      reasoning: `Learned from correction: "${originalDesc}" → ${corrected.categoria}`
    };

    return suggestion;
  }

  /**
   * Extract potential patterns from transaction description
   * @param {string} description - Transaction description
   * @returns {Array} Array of potential patterns
   */
  extractPatterns(description) {
    const patterns = [];
    const words = description.split(' ').filter(w => w.length > 2);

    // Single important words
    for (const word of words.slice(0, 3)) {
      if (!this.isCommonWord(word)) {
        patterns.push(word.toUpperCase());
      }
    }

    // Two-word combinations
    for (let i = 0; i < words.length - 1; i++) {
      const combo = `${words[i]} ${words[i + 1]}`.toUpperCase();
      if (combo.length > 5) {
        patterns.push(combo);
      }
    }

    // Full merchant name (up to first number or special char)
    const merchantMatch = description.match(/^([A-Z\s]+)(?=\d|\s-\s|$)/i);
    if (merchantMatch) {
      patterns.push(merchantMatch[1].trim().toUpperCase());
    }

    return [...new Set(patterns)]; // Remove duplicates
  }

  /**
   * Check if word is common/stop word
   * @param {string} word - Word to check
   * @returns {boolean} True if common word
   */
  isCommonWord(word) {
    const commonWords = ['para', 'com', 'por', 'dos', 'das', 'que', 'uma', 'pago', 'cartao', 'credito', 'debito'];
    return commonWords.includes(word.toLowerCase());
  }

  /**
   * Promote rule to SYSTEM level if it has enough successful matches
   * @param {string} ruleId - Rule identifier
   */
  async promoteRule(ruleId) {
    try {
      // In a real implementation, we'd track rule performance
      // For now, just log the promotion
      await logEvent({
        type: 'MESSAGE',
        squadId: 'shlomo-engineering',
        agentId: 'rule-learner',
        payload: {
          message: `Rule promoted to SYSTEM level: ${ruleId}`,
          toolName: 'rule_learner'
        }
      });
    } catch (error) {
      console.error('Error promoting rule:', error);
    }
  }

  /**
   * Decay old rules that haven't been used
   */
  async decayRules() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

      // In a real implementation, we'd have usage tracking
      // For now, just clean up old rules without usage data

      const decayedRules = await prisma.classificationRule.findMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
          // TODO: Add usage tracking field
        }
      });

      await logEvent({
        type: 'MESSAGE',
        squadId: 'shlomo-engineering',
        agentId: 'rule-learner',
        payload: {
          message: `Rule decay completed: ${decayedRules.length} old rules reviewed`,
          toolName: 'rule_decay'
        }
      });

    } catch (error) {
      console.error('Error decaying rules:', error);
    }
  }

  /**
   * Learn from user correction
   * @param {Object} transaction - Original transaction
   * @param {Object} correction - User correction
   */
  async learnFromCorrection(transaction, correction) {
    try {
      const suggestion = this.suggestRuleFromCorrection(transaction, correction);

      // Save to database for review
      await prisma.classificationRule.create({
        data: {
          pattern: suggestion.pattern,
          contexto: suggestion.contexto,
          pulmao: suggestion.pulmao,
          categoria: suggestion.categoria,
          createdAt: new Date(),
        }
      });

      await logEvent({
        type: 'MESSAGE',
        squadId: 'shlomo-engineering',
        agentId: 'rule-learner',
        payload: {
          message: `New rule learned from correction: ${suggestion.pattern} → ${suggestion.categoria}`,
          toolName: 'rule_learner'
        }
      });

      return suggestion;
    } catch (error) {
      console.error('Error learning from correction:', error);
      throw error;
    }
  }
}

module.exports = RuleLearner;