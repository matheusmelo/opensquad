const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@deepgram/sdk');
const OpenAI = require('openai');

// Configuração
const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH || './sessions/whatsapp';
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENSQUAD_BASE_PATH = process.env.OPENSQUAD_BASE_PATH || 'C:/inetpub/opensquad';

// Inicializar clientes
const deepgram = createClient(DEEPGRAM_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
  puppeteer: { headless: true, args: ['--no-sandbox'] }
});

// QR Code para autenticação
client.on('qr', (qr) => {
  console.log('📱 Escaneie o QR Code do WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp client pronto!');
  console.log(`📞 Número conectado: ${client.info.wid._serialized}`);
});

// Listener de mensagens
client.on('message', async (msg) => {
  try {
    console.log(`📨 Mensagem de ${msg.from}: ${msg.body.substring(0, 50)}...`);
    
    // Ignorar mensagens de status/grupo
    if (msg.from.includes('status') || msg.from.includes('g.us')) {
      return;
    }

    // Se tem mídia (áudio ou PDF)
    if (msg.hasMedia) {
      await handleMediaMessage(msg);
      return;
    }

    // Processar texto como comando
    await handleTextCommand(msg);

  } catch (error) {
    console.error('❌ Erro processando mensagem:', error);
    msg.reply('Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.');
  }
});

async function handleMediaMessage(msg) {
  const media = await msg.downloadMedia();
  const timestamp = Date.now();
  const inputDir = path.join(OPENSQUAD_BASE_PATH, 'squads/shlomo-engineering/input');
  
  // Garantir pasta input existe
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
  }

  // Se é áudio
  if (media.mimetype.startsWith('audio/')) {
    console.log('🎤 Processando áudio...');
    
    // Salvar arquivo temporário
    const audioPath = path.join(inputDir, `audio-${timestamp}.opus`);
    const buffer = Buffer.from(media.data, 'base64');
    fs.writeFileSync(audioPath, buffer);

    // Transcrever com Deepgram
    const transcription = await transcribeAudio(audioPath);
    console.log(`📝 Transcrição: ${transcription}`);

    // Interpretar intenção
    const intent = await interpretIntent(transcription);
    console.log(`🧠 Intenção: ${intent.squad}`);

    // Dispatch para squad
    await dispatchToSquad(intent, msg);

    // Limpar arquivo temporário
    fs.unlinkSync(audioPath);
  }

  // Se é PDF
  else if (media.mimetype === 'application/pdf') {
    console.log('📄 Processando PDF...');
    
    const pdfPath = path.join(inputDir, `fatura-${timestamp}.pdf`);
    const buffer = Buffer.from(media.data, 'base64');
    fs.writeFileSync(pdfPath, buffer);

    // Confirmar recebimento
    msg.reply(`✅ PDF recebido: ${path.basename(pdfPath)}\n\nIniciando processamento com squad Shlomo Engineering...`);

    // Dispatch para squad de engenharia
    await dispatchToSquad({
      squad: 'shlomo-engineering',
      action: 'parse_and_classify',
      file: pdfPath,
      user_message: msg.body || 'Processe esta fatura'
    }, msg);
  }
}

async function handleTextCommand(msg) {
  const text = msg.body.trim();

  // Detectar comandos especiais
  if (text.startsWith('/status')) {
    const squadName = text.split(' ')[1] || 'shlomo-engineering';
    await reportSquadStatus(squadName, msg);
    return;
  }

  if (text.startsWith('/help')) {
    await sendHelpMessage(msg);
    return;
  }

  // Interpretar como prompt normal
  const intent = await interpretIntent(text);
  
  // Se menciona squad específica
  if (intent.squad) {
    await dispatchToSquad({
      ...intent,
      user_message: text
    }, msg);
  } else {
    // Resposta genérica ou roteamento inteligente
    msg.reply('🤔 Não identifiquei qual squad você quer usar. Tente:\n\n- "/shlomo processe minha fatura"\n- "/status shlomo-engineering"\n- Envie um PDF diretamente');
  }
}

async function transcribeAudio(audioPath) {
  const { readFile } = require('fs/promises');
  const audioBuffer = await readFile(audioPath);

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: 'nova-2',
      language: 'pt-BR',
      smart_format: true,
      punctuate: true
    }
  );

  if (error) {
    throw new Error(`Erro na transcrição: ${error.message}`);
  }

  return result.channels[0].alternatives[0].transcript;
}

async function interpretIntent(text) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Você é um intérprete de comandos para o sistema Opensquad. 
        Analise a mensagem do usuário e identifique:
        1. Qual squad ele quer usar (shlomo-engineering, gestao-pessoal, etc.)
        2. Qual ação deseja executar
        3. Quais parâmetros/file references estão envolvidos
        
        Retorne APENAS JSON válido com estrutura:
        {
          "squad": "nome-da-squad",
          "action": "acao_desejada",
          "parameters": {},
          "confidence": 0.0-1.0
        }`
      },
      {
        role: 'user',
        content: text
      }
    ],
    response_format: { type: 'json_object' }
  });

  return JSON.parse(completion.choices[0].message.content);
}

async function dispatchToSquad(intent, msg) {
  const { squad, action, parameters, user_message } = intent;
  
  // Construir prompt para squad
  const prompt = `
# Comando via WhatsApp

**Usuário:** ${msg.from}
**Ação:** ${action}
**Mensagem original:** "${user_message}"

${parameters.file ? `**Arquivo anexado:** ${parameters.file}` : ''}

## Instruções
Execute a ação solicitada e prepare um resumo conciso para resposta via WhatsApp (máximo 500 caracteres).
`;

  // Salvar prompt em arquivo para squad processar
  const squadPath = path.join(OPENSQUAD_BASE_PATH, `squads/${squad}`);
  const whatsappQueuePath = path.join(squadPath, 'whatsapp-queue.json');
  
  let queue = [];
  if (fs.existsSync(whatsappQueuePath)) {
    queue = JSON.parse(fs.readFileSync(whatsappQueuePath, 'utf-8'));
  }

  queue.push({
    id: Date.now(),
    prompt,
    from: msg.from,
    timestamp: new Date().toISOString()
  });

  fs.writeFileSync(whatsappQueuePath, JSON.stringify(queue, null, 2));

  // Confirmar recebimento
  msg.reply(`✅ Comando recebido!\n\nSquad: ${squad}\nAção: ${action}\n\nVou te notificar quando estiver pronto.`);

  // TODO: Implementar webhook/callback para notificar quando squad concluir
}

async function reportSquadStatus(squadName, msg) {
  const statePath = path.join(OPENSQUAD_BASE_PATH, `squads/${squadName}/state.json`);
  
  if (!fs.existsSync(statePath)) {
    msg.reply(`⚪ Squad ${squadName} não está em execução no momento.`);
    return;
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  
  const statusMessage = `
📊 Status da Squad ${squadName}

Etapa: ${state.step.current}/${state.step.total} - ${state.step.label}
Status: ${state.status}

Agentes:
${state.agents.map(a => `${a.icon} ${a.name}: ${a.status}`).join('\n')}
`;

  msg.reply(statusMessage);
}

async function sendHelpMessage(msg) {
  const helpText = `
🤖 *Opensquad WhatsApp Bot*

*Comandos disponíveis:*

1️⃣ *Executar Squad*
Envie: "/shlomo processe minha fatura"
Ou: Anexe um PDF + texto explicando

2️⃣ *Ver Status*
Envie: "/status shlomo-engineering"

3️⃣ *Consultar Dados*
Envie: "Quanto gastei com Uber esse mês?"

4️⃣ *Adicionar Regras*
Envie áudio ou texto: "Toda compra na Amazon vai pro Pulmão 2"

*Limitações atuais:*
- Áudios de até 5 minutos
- PDFs de até 10MB
- Respostas em até 2 minutos
`;

  msg.reply(helpText);
}

// Iniciar cliente
console.log('🚀 Iniciando WhatsApp MCP Server...');
client.initialize();

// Exportar para uso como módulo MCP
module.exports = { client };
