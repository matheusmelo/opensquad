# Task: Analisar Requisito

## Descrição
Analisar o requisito/tarefa fornecido pelo usuário e identificar:
- Escopo da tarefa
- Arquivos afetados
- Dependências necessárias
- Riscos potenciais

## Input
Prompt do usuário descrevendo a tarefa

## Processo

1. **Classificar tipo de tarefa:**
   - Feature nova
   - Bug fix
   - Refatoração
   - Deploy/Infraestrutura
   - Documentação

2. **Identificar arquivos afetados:**
   - Listar arquivos existentes que precisam ser modificados
   - Identificar novos arquivos necessários

3. **Mapear dependências:**
   - Novos pacotes npm/pip necessários?
   - Mudanças no schema de database?
   - Variáveis de ambiente novas?

4. **Avaliar complexidade:**
   - Baixa (< 1 hora)
   - Média (1-4 horas)
   - Alta (> 4 horas)

5. **Identificar riscos:**
   - Breaking changes?
   - Possibilidade de regressão?
   - Performance impact?

## Output

Plano de execução estruturado:

```markdown
## 📋 Plano de Execução

**Tarefa:** {nome}
**Tipo:** Feature/Bug/Refactor
**Complexidade estimada:** Baixa/Média/Alta

**Arquivos a modificar:**
- `path/to/file1.ts`: {motivo}
- `path/to/file2.py`: {motivo}

**Novos arquivos:**
- `path/to/new-file.ts`: {motivo}

**Dependências:**
- npm install {package}
- pip install {package}

**Riscos identificados:**
- {risco 1}
- {risco 2}

**Passos de implementação:**
1. Passo 1
2. Passo 2
3. Passo 3

**Testes necessários:**
- [ ] Unit test X
- [ ] Integration test Y
- [ ] E2E test Z
```
