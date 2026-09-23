// Login da equipe (Funcionário e Controle).
//   POST /api/login  { usuario, senha }  ->  { token, pessoa: { id, nome, nivel } }
// Depois de 5 senhas erradas seguidas, o usuário fica bloqueado por 5 minutos.

const { config, send, readJsonBody, rest, confereSenha, criarToken } = require('./_supabase.js');

const TENTATIVAS = 5;
const BLOQUEIO_MIN = 5;
const INCORRETO = { error: 'login_incorreto' };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const c = config();
  if (!c) return send(res, 501, { error: 'not_configured' });

  let body;
  try { body = await readJsonBody(req); } catch { return send(res, 400, { error: 'bad_request' }); }
  const usuario = String(body.usuario || '').trim().toLowerCase();
  const senha = String(body.senha || '');
  if (!/^[a-z0-9._-]{2,40}$/.test(usuario) || !senha || senha.length > 200) return send(res, 401, INCORRETO);

  try {
    const [u] = await rest(c, `sd_funcionarios?select=id,nome,nivel,ativo,senha_hash,sessao_versao,login_falhas,login_bloqueado_ate&usuario=eq.${encodeURIComponent(usuario)}`) || [];
    if (!u || !u.ativo || !u.senha_hash) return send(res, 401, INCORRETO);
    if (u.login_bloqueado_ate && new Date(u.login_bloqueado_ate).getTime() > Date.now()) return send(res, 429, { error: 'bloqueado' });

    const filtro = `sd_funcionarios?id=eq.${encodeURIComponent(u.id)}`;
    if (!confereSenha(senha, u.senha_hash)) {
      const falhas = (u.login_falhas || 0) + 1;
      const bloqueia = falhas >= TENTATIVAS;
      await rest(c, filtro, { method: 'PATCH', prefer: 'return=minimal', body: {
        login_falhas: bloqueia ? 0 : falhas,
        login_bloqueado_ate: bloqueia ? new Date(Date.now() + BLOQUEIO_MIN * 60000).toISOString() : null,
      } });
      return send(res, bloqueia ? 429 : 401, bloqueia ? { error: 'bloqueado' } : INCORRETO);
    }
    if (u.login_falhas || u.login_bloqueado_ate) {
      await rest(c, filtro, { method: 'PATCH', prefer: 'return=minimal', body: { login_falhas: 0, login_bloqueado_ate: null } });
    }
    return send(res, 200, { token: criarToken(c, u), pessoa: { id: u.id, nome: u.nome, nivel: u.nivel } });
  } catch (e) {
    console.error(e);
    return send(res, e.status || 500, { error: e.code || 'server_error' });
  }
};
