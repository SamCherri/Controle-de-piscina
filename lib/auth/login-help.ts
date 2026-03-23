import { isProduction } from '@/lib/auth/config';

export type LoginHelpInput = {
  defaultAdmin: {
    email: string;
    name: string;
  };
  productionOverride?: boolean;
};

export function getLoginHelpContent({ defaultAdmin, productionOverride }: LoginHelpInput) {
  const developmentMode = !(productionOverride ?? isProduction());

  return {
    title: developmentMode ? 'Acesso administrativo inicial (somente desenvolvimento)' : 'Acesso administrativo',
    description: developmentMode
      ? 'Em desenvolvimento, o bootstrap do administrador inicial usa os valores configurados no ambiente. A senha temporária não é exibida na interface.'
      : 'Use suas credenciais administrativas para acessar a plataforma.',
    emailLabel: developmentMode ? defaultAdmin.email : null,
    nameLabel: developmentMode ? defaultAdmin.name : null,
    showDevelopmentFillAction: developmentMode
  };
}
