/** 软删除用户时改写账号，释放唯一约束供新用户使用 */
export function buildDeletedAccountPlaceholder(userId: number): string {
  const ts = Date.now().toString(36);
  const s = `d${userId}_${ts}`;
  return s.length <= 64 ? s : s.slice(0, 64);
}
