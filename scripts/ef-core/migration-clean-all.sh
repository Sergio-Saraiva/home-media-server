#!/bin/bash

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")/.."

MIGRATIONS_DIR="../../apps/MediaServer.Infrastructure/Migrations"

echo -e "${RED}ATENÇÃO: Isso apagará TODOS os arquivos de migração do projeto Infrastructure.${NC}"
read -p "Tem certeza absoluta? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Cancelado."
    exit 1
fi

echo -e "${YELLOW}Apagando pasta $MIGRATIONS_DIR ...${NC}"
rm -rf "$MIGRATIONS_DIR"

echo -e "${YELLOW}Limpando Snapshot do banco...${NC}"
# Opcional: Recriar a pasta vazia
mkdir -p "$MIGRATIONS_DIR"

echo "Histórico de migrações limpo. O banco de dados atual pode estar inconsistente com o código."