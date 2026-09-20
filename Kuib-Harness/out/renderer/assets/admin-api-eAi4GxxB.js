import { H as supabase } from "./index-BsLBVoAX.js";
async function requireAccessToken() {
  if (!supabase) throw new Error("Supabase não configurado (.env)");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão ausente");
  return token;
}
async function getAdminStats() {
  return window.admin.getStats(await requireAccessToken());
}
async function listAdminUsuarios() {
  return window.admin.listUsuarios(await requireAccessToken());
}
export {
  getAdminStats as g,
  listAdminUsuarios as l
};
