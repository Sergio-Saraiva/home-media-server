#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Garante que o script roda na raiz do repo
cd "$(dirname "$0")/.."

STARTUP_PROJECT="../apps/MediaServer.Api/MediaServer.Api.csproj"
INFRA_PROJECT="../apps/MediaServer.Infrastructure/MediaServer.Infrastructure.csproj"

if [ -z "$1" ]; then
    echo -e "${RED}Erro: Você precisa fornecer um nome para a migração.${NC}"
    echo "Uso: ./scripts/migration-add.sh NomeDaMigracao"
    exit 1
fi

echo -e "${GREEN}Criando migração '$1'...${NC}"

dotnet ef migrations add "$1" \
    --project "$INFRA_PROJECT" \
    --startup-project "$STARTUP_PROJECT" -v

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Migração criada com sucesso! Não esqueça de rodar o db-update.${NC}"
else
    echo -e "${RED}Falha ao criar migração.${NC}"
fi