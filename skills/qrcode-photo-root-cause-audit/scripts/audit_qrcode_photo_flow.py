#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()

FILES = {
    'photo_route': ROOT / 'app/api/measurements/[measurementId]/photo/route.ts',
    'public_page': ROOT / 'app/public/piscinas/[slug]/page.tsx',
    'dashboard_page': ROOT / 'app/(dashboard)/condominios/[condominiumId]/piscinas/[poolId]/page.tsx',
    'edit_page': ROOT / 'app/(dashboard)/condominios/[condominiumId]/piscinas/[poolId]/medicoes/[measurementId]/editar/page.tsx',
    'public_url': ROOT / 'lib/public-url.ts',
    'persistence': ROOT / 'lib/measurement-photo-persistence.ts',
    'actions': ROOT / 'lib/actions.ts',
    'form': ROOT / 'components/forms/measurement-form.tsx',
}


def read(key: str) -> str:
    path = FILES[key]
    return path.read_text() if path.exists() else ''


def check_cache_versioning():
    photo_route = read('photo_route')
    pages = read('public_page') + read('dashboard_page') + read('edit_page')
    if 'immutable' in photo_route and 'updatedAt.getTime()' not in pages:
        return ('critical', 'A rota de foto usa cache imutável, mas as telas não versionam a URL com updatedAt.')
    if 'must-revalidate' in photo_route and 'updatedAt.getTime()' in pages:
        return ('ok', 'A entrega da foto usa revalidação e as telas versionam a URL com updatedAt.')
    if 'updatedAt.getTime()' in pages:
        return ('warning', 'As telas versionam a URL com updatedAt, mas a política de cache da rota deve ser revisada manualmente.')
    return ('warning', 'Não foi possível confirmar o versionamento correto da URL da foto.')


def check_legacy_storage():
    persistence = read('persistence')
    if 'A foto legada não foi encontrada neste ambiente.' in persistence:
        return ('warning', 'Ainda existe recuperação de photoPath legado a partir de disco/URL externa; isso é risco operacional em deploys efêmeros.')
    return ('ok', 'Não foi detectada dependência explícita de photoPath legado no fluxo de entrega.')


def check_public_host():
    public_url = read('public_url')
    if 'NEXT_PUBLIC_APP_URL' in public_url and 'localhost:3000' in public_url:
        return ('warning', 'O QR code depende de ambiente bem configurado; sem domínio canônico pode apontar para host não compartilhável.')
    return ('ok', 'Não foi detectado fallback óbvio para host local/privado.')


def check_upload_persistence():
    actions = read('actions')
    form = read('form')
    if 'prepareImageUpload' in actions and 'multipart/form-data' in form:
        return ('ok', 'O formulário envia multipart/form-data e o servidor valida/persiste o upload.')
    return ('warning', 'Não foi possível confirmar o pipeline completo de upload e persistência.')


checks = {
    'cache_versioning': check_cache_versioning(),
    'legacy_storage': check_legacy_storage(),
    'public_host': check_public_host(),
    'upload_persistence': check_upload_persistence(),
}

print('# QR Code Photo Flow Audit')
print()
for name, (status, message) in checks.items():
    print(f'- [{status}] {name}: {message}')
