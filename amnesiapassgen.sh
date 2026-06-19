#!/bin/bash

# Inicializa variáveis
NUM_CHARS=""
ITERATIONS=""
ALGO=""
KEYWORD=""
SALT=""
PREFIX=""
SUFFIX=""

# Loop para processar as flags (-c, -i, -a, -p, -s, -x, -y)
while getopts "c:i:a:p:s:x:y:" opt; do
    case $opt in
        c)
            NUM_CHARS="$OPTARG"
            ;;
    i)
      ITERATIONS="$OPTARG"
      ;;
    a)
      ALGO="$OPTARG"
      ;;
        p)
            KEYWORD="$OPTARG"
            ;;
        s)
            SALT="$OPTARG"
            ;;
        x)
            PREFIX="$OPTARG"
            ;;
        y)
            SUFFIX="$OPTARG"
            ;;
        \?)
            echo "Opção inválida: -$OPTARG" >&2
            exit 1
            ;;
        :)
      echo "A opção -$OPTARG requer um argumento." >&2
      exit 1
      ;;
  esac
done

# Definir valor padrão para ITERATIONS se não for informado
ITERATIONS=${ITERATIONS:-1}

# Validar se os parâmetros obrigatórios (KEYWORD e ALGO) foram preenchidos
if [ -z "$KEYWORD" ] || [ -z "$ALGO" ]; then
    echo "Uso: $0 -p <palavra_chave> -a <algoritmo> [-c <num_caracteres>] [-i <num_iteracoes>] [-s <salt_servico>] [-x <prefixo>] [-y <sufixo>]"
    echo "  -p: Palavra-chave (seed) para gerar a senha (obrigatório)"
    echo "  -a: Algoritmo de hash (obrigatório: sha512)"
    echo "  -c: Número de caracteres (opcional, se omitido, retorna o hash completo)"
    echo "  -i: Número de iterações (opcional, padrão: 1)"
    echo "  -s: Salt ou identificador do serviço (opcional) adicionado à palavra-chave"
    echo "  -x: Prefixo (opcional) adicionado ao resultado final"
    echo "  -y: Sufixo (opcional) adicionado ao resultado final"
    echo ""
    echo "Exemplo: $0 -p minha_senha -a sha512 -c 10 -i 5 -s gmail -x '#meu' -y '#sobrenome'"
    exit 1
fi

# Selecionar comando baseada no algoritmo
case $ALGO in
    sha512)
        HASH_CMD="sha512sum"
        ;;
    *)
        echo "Algoritmo inválido. Use: sha512"
        exit 1
        ;;
esac

CURRENT_VAL=$KEYWORD

if [ -n "$SALT" ]; then
    CURRENT_VAL="${CURRENT_VAL}:$SALT"
fi

for (( i=1; i<=$ITERATIONS; i++ )); do
    # Gera o hash completo e atualiza CURRENT_VAL para a próxima iteração
    CURRENT_VAL=$(echo -n "$CURRENT_VAL" | $HASH_CMD | awk '{print $1}')
done

# Corta o resultado final APENAS se NUM_CHARS foi especificado
if [ -z "$NUM_CHARS" ]; then
    FINAL_RESULT="$CURRENT_VAL"
else
    FINAL_RESULT=$(echo "$CURRENT_VAL" | cut -c 1-$NUM_CHARS)
fi

FINAL_OUTPUT="${PREFIX}${FINAL_RESULT}${SUFFIX}"
echo "Passwd: ${FINAL_OUTPUT}"
echo "Length: ${#FINAL_OUTPUT}"
