const { z } = require('zod');

/**
 * Validation middleware using Zod
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} property - req property to validate ('body' | 'query' | 'params')
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req[property]);
      req[property] = validated;
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
  };
}

module.exports = { validate };