# Task: Construir Regras de Parser

## Descrição
Criar regras de parsing baseadas na estrutura identificada para extrair todas as transações do PDF.

## Input
- Arquivo `pdf-structure.yaml` gerado na task anterior
- PDF original para validação

## Processo

1. **Carregar estrutura mapeada**
   - Ler `pdf-structure.yaml`
   - Validar que regex_patterns estão presentes

2. **Implementar parser em Python/JavaScript**
   ```python
   import re
   import pdfplumber
   
   def parse_fatura_nubank(pdf_path):
       transactions = []
       with pdfplumber.open(pdf_path) as pdf:
           for page in pdf.pages:
               text = page.extract_text()
               lines = text.split('\n')
               
               for line in lines[15:87]:  # entre inicio e fim da tabela
                   match = re.match(
                       r'(\d{2}/\d{2})\s(.+?)\s+R\$\s*(-?[\d,]+\.\d{2})',
                       line
                   )
                   if match:
                       transactions.append({
                           'data': match.group(1),
                           'descricao': match.group(2),
                           'valor': float(match.group(3).replace(',', ''))
                       })
       
       return transactions
   ```

3. **Testar parser**
   - Executar contra PDF original
   - Contar transações extraídas
   - Validar formato dos dados

4. **Gerar script reutilizável**
   - Salvar em `squads/shlomo-engineering/parsers/{banco}_parser.py`
   - Documentar parâmetros de execução

## Output

1. **Script de parser** (`parsers/nubank_parser.py`)
2. **Log de execução** com estatísticas:
   ```
   Total de linhas processadas: 72
   Transações extraídas: 68
   Linhas ignoradas (sem match): 4
   Taxa de sucesso: 94.4%
   ```

## Critérios de Qualidade
- Parser deve ser modular (fácil adicionar novo banco)
- Deve lidar com edge cases (valores negativos, descrições multiline)
- Código comentado e documentado
