#!/bin/bash

RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "$0")/.."

STARTUP_PROJECT="../apps/MediaServer.Api/MediaServer.Api.csproj"
INFRA_PROJECT="../apps/MediaServer.Infrastructure/MediaServer.Infrastructure.csproj"

echo -e "${RED}PERIGO: Isso reverterá o banco de dados para o estado ZERO (sem tabelas).${NC}"
echo "Todos os dados nas tabelas gerenciadas pelo EF serão perdidos."
read -p "Tem certeza? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# O target '0' é o comando especial do EF para reverter tudo
dotnet ef database update 0 \
    --project "$INFRA_PROJECT" \
    --startup-project "$STARTUP_PROJECT" -v

echo "Banco de dados resetado com sucesso."