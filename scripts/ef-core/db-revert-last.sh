#!/bin/bash

BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

cd "$(dirname "$0")/.."

STARTUP_PROJECT="../apps/MediaServer.Api/MediaServer.Api.csproj"
INFRA_PROJECT="../apps/MediaServer.Infrastructure/MediaServer.Infrastructure.csproj"

echo -e "${BLUE}Lista de migrações aplicadas:${NC}"

# Lista migrações para ajudar o usuário
dotnet ef migrations list \
    --project "$INFRA_PROJECT" \
    --startup-project "$STARTUP_PROJECT"

echo ""
echo -e "${GREEN}Para desfazer a última, copie o nome da PENÚLTIMA migração acima.${NC}"
echo "Se quiser limpar tudo, digite '0'."
read -p "Nome da migração alvo: " TARGET_MIGRATION

if [ -z "$TARGET_MIGRATION" ]; then
    echo "Operação cancelada."
    exit 1
fi

dotnet ef database update "$TARGET_MIGRATION" \
    --project "$INFRA_PROJECT" \
    --startup-project "$STARTUP_PROJECT" -v