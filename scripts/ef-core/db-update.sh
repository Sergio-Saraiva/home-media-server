#!/bin/bash

GREEN='\033[0;32m'
NC='\033[0m'

cd "$(dirname "$0")/.."

STARTUP_PROJECT="../apps/MediaServer.Api/MediaServer.Api.csproj"
INFRA_PROJECT="../apps/MediaServer.Infrastructure/MediaServer.Infrastructure.csproj"

echo -e "${GREEN}Aplicando migrações pendentes no banco de dados...${NC}"

dotnet ef database update \
    --project "$INFRA_PROJECT" \
    --startup-project "$STARTUP_PROJECT" -v

echo -e "${GREEN}Banco de dados atualizado!${NC}"