// Peças comuns das funções que falam com o Supabase (projeto "Strike Details DATABASE").
// Arquivos da pasta api/ que começam com "_" não viram endereço na Vercel.
//
// Variáveis de ambiente (Vercel > Project Settings > Environment Variables):
//   SUPABASE_URL    endereço do projeto (https://....supabase.co)
//   SUPABASE_KEY    chave publicável do Supabase (sb_publishable_...). Não é secreta.
//   SD_CHAVE_BANCO  chave secreta que libera as tabelas sd_ (vai no cabeçalho x-sd-chave).
//                   O mesmo valor fica na tabela privado.sd_config do banco.
//   ACCESS_CODE     (opcional) código da equipe. Se existir, o site pede o código uma vez por aparelho.
//
// Regra do banco: nada é apagado. As tabelas sd_ não têm permissão de DELETE;
// "excluir" no sistema só marca o registro (excluido_em, ativo = false, removida_em).

const BUCKET = 'sd-fotos';

function config() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_KEY || '';
  const chave = process.env.SD_CHAVE_BANCO || '';
  if (!url || !key || !chave) return null;
  return { url, key, chave };
}

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

const erro = (status, code, detail) => Object.assign(new Error(code), { status, code, detail });

// Código da equipe (opcional). Mesmo cabeçalho usado pelo leitor de placa.
function acessoOk(req) {
  const code = process.env.ACCESS_CODE;
  return !code || req.headers['x-access-code'] === code;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body; // Vercel já decodifica JSON
  let raw = '';
  if (typeof req.body === 'string') raw = req.body;
  else for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function readRawBody(req, limit) {
  if (Buffer.isBuffer(req.body)) return req.body;
  const parts = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw erro(413, 'too_large');
    parts.push(chunk);
  }
  return Buffer.concat(parts);
}

// Chamada à API REST do banco (PostgREST).
async function rest(c, path, { method = 'GET', body, prefer } = {}) {
  const headers = { apikey: c.key, 'x-sd-chave': c.chave, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  let res;
  try {
    res = await fetch(`${c.url}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw erro(502, 'banco_indisponivel');
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    const code = data && data.code;
    if (code === '23505') throw erro(409, 'duplicado', data.details || data.message);
    throw erro(res.status >= 500 ? 502 : 400, 'banco', (data && (data.message || data.hint)) || `HTTP ${res.status}`);
  }
  return data;
}

// Lê todas as linhas, de 1000 em 1000 (limite padrão do Supabase por consulta).
async function restAll(c, path) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await rest(c, `${path}${path.includes('?') ? '&' : '?'}limit=1000&offset=${offset}`);
    out.push(...(page || []));
    if (!page || page.length < 1000) return out;
  }
}

// Envia uma foto para o Storage. Nunca sobrescreve nem apaga.
async function uploadFoto(c, caminho, buffer) {
  let res;
  try {
    res = await fetch(`${c.url}/storage/v1/object/${BUCKET}/${caminho}`, {
      method: 'POST',
      headers: {
        apikey: c.key,
        'x-sd-chave': c.chave,
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'max-age=31536000',
        'x-upsert': 'false',
      },
      body: buffer,
    });
  } catch {
    throw erro(502, 'banco_indisponivel');
  }
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  // Mesmo arquivo já enviado (nova tentativa depois de falha na rede): tudo certo.
  if (res.status === 409 || String(data.statusCode) === '409' || /exist|duplicate/i.test(data.error || data.message || '')) return;
  throw erro(502, 'storage', data.message || data.error || `HTTP ${res.status}`);
}

const fotoBase = c => `${c.url}/storage/v1/object/public/${BUCKET}/`;
const ms = v => (v ? new Date(v).getTime() : null);
const iso = v => {
  const n = Number(v);
  return v == null || v === '' || !Number.isFinite(n) ? null : new Date(n).toISOString();
};

module.exports = { config, send, erro, acessoOk, readJsonBody, readRawBody, rest, restAll, uploadFoto, fotoBase, ms, iso };
