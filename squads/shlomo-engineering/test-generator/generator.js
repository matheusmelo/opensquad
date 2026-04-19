const fs = require('fs');
const path = require('path');
const MultiAIRouter = require('../../../orchestrator/multi-ai-router');

class TestGenerator {
  constructor() {
    this.router = new MultiAIRouter();
  }

  async generateTestsForFile(filePath, autoWrite = false) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    const prompt = `
Gere testes unitários para este arquivo Node.js usando node --test nativo.
Retorne APENAS o código dos testes, sem explicações.

Arquivo: ${fileName}

Conteúdo:
\`\`\`javascript
${content}
\`\`\`

Gere testes para cada função exportada. Use:
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
`;

    const response = await this.router.routePrompt(prompt, { complexity: 'medium' });

    if (autoWrite) {
      const testPath = filePath.replace('.js', '.test.js');
      fs.writeFileSync(testPath, response);
      return { testPath, content: response };
    }

    return { content: response };
  }
}

module.exports = TestGenerator;
