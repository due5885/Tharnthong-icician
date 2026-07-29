import dumrongAvatar from '../assets/images/dumrong_avatar.jpg';

// Matched by name (not stored per-admin) so it still works even for browsers whose saved
// admin list predates this feature and has no avatarImage field.
export function resolveAdminAvatarByName(name: string): string | undefined {
  if (name.includes('Dumrong')) return dumrongAvatar;
  return undefined;
}
