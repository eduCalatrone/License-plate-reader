// Envio de foto para o Storage do Supabase (bucket sd-fotos).
//   POST /api/foto?id=<id aleatório>&tipo=foto|mini   corpo: a imagem JPEG (application/octet-stream)
// Responde { caminho }. O registro da foto no atendimento é gravado depois, por /api/dados.
// Nunca sobrescreve nem apaga arquivos.

const { config, send, readRawBody, uploadFoto, usuarioDaSessao } = require('./_supabase.js');

const MAX_BYTES = 4 * 1024 * 1024; // a Vercel aceita até 4,5 MB por requisição

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const c = config();
  if (!c) return send(res, 501, { error: 'not_configured' });
  try { await usuarioDaSessao(c, req); }
  catch (e) { return send(res, e.status || 500, { error: e.code || 'server_error' }); }

  const url = new URL(req.url, 'http://localhost');
  const id = url.searchParams.get('id') || '';
  const tipo = url.searchParams.get('tipo') === 'mini' ? 'mini' : 'foto';
  if (!/^[a-z0-9]{16,64}$/.test(id)) return send(res, 400, { error: 'bad_request' });

  let buffer;
  try { buffer = await readRawBody(req, MAX_BYTES); }
  catch (e) { return send(res, e.status || 400, { error: e.code || 'bad_request' }); }
  if (buffer.length > MAX_BYTES) return send(res, 413, { error: 'too_large' });
  // Só JPEG (o site sempre converte antes de enviar).
  if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) return send(res, 400, { error: 'bad_request' });

  const caminho = `${tipo === 'mini' ? 'miniaturas' : 'fotos'}/${id}.jpg`;
  try {
    await uploadFoto(c, caminho, buffer);
  } catch (e) {
    console.error(e);
    return send(res, e.status || 502, { error: e.code || 'storage' });
  }
  return send(res, 200, { caminho });
};
