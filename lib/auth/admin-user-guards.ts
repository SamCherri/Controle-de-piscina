export function validateAdminUserDeletion(input: {
  targetUserId: string;
  currentUserId: string;
  targetRole: string;
  adminCount: number;
}) {
  if (input.targetUserId === input.currentUserId) {
    return 'Não é permitido excluir a própria conta por esta tela.';
  }

  if (input.targetRole === 'admin' && input.adminCount <= 1) {
    return 'Não é permitido excluir o último usuário com role admin.';
  }

  return null;
}

export function validateAdminUserRoleChange(input: {
  targetUserId: string;
  currentUserId: string;
  currentRole: string;
  nextRole: string;
  adminCount: number;
}) {
  if (input.targetUserId === input.currentUserId && input.nextRole !== 'admin') {
    return 'Não é permitido remover o próprio acesso administrativo por esta tela.';
  }

  if (input.currentRole === 'admin' && input.nextRole !== 'admin' && input.adminCount <= 1) {
    return 'Não é permitido remover o role admin do último usuário administrativo.';
  }

  return null;
}
