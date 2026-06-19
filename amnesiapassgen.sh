#!/bin/bash

# Inicializa variáveis
NUM_CHARS=""
ITERATIONS=""
ALGO=""
KEYWORD=""
SALT=""
PREFIX=""
SUFFIX=""
DECRYPT_MODE=false
JSON_FILE=""
PROFILE_NAME=""

# Loop para processar as flags
while getopts "c:i:a:p:s:x:y:df:n:" opt; do
    case $opt in
        c) NUM_CHARS="$OPTARG" ;;
        i) ITERATIONS="$OPTARG" ;;
        a) ALGO="$OPTARG" ;;
        p) KEYWORD="$OPTARG" ;;
        s) SALT="$OPTARG" ;;
        x) PREFIX="$OPTARG" ;;
        y) SUFFIX="$OPTARG" ;;
        d) DECRYPT_MODE=true ;;
        f) JSON_FILE="$OPTARG" ;;
        n) PROFILE_NAME="$OPTARG" ;;
        \?) echo "Opção inválida: -$OPTARG" >&2; exit 1 ;;
        :)  echo "A opção -$OPTARG requer um argumento." >&2; exit 1 ;;
    esac
done

# ── Modo descriptografar ──────────────────────────────────────────────────────

if [ "$DECRYPT_MODE" = true ]; then

    if [ -z "$KEYWORD" ] || [ -z "$JSON_FILE" ] || [ -z "$PROFILE_NAME" ]; then
        echo "Uso (descriptografar perfil):"
        echo "  $0 -d -f <arquivo.json> -n <nome_perfil> -p <palavra_chave>"
        echo ""
        echo "  -d        Ativa o modo de descriptografia"
        echo "  -f        Caminho para o arquivo .json exportado da versão web"
        echo "  -n        Nome do perfil a descriptografar"
        echo "  -p        Palavra-chave usada ao salvar o perfil"
        echo ""
        echo "  Opções opcionais para sobrepor o perfil:"
        echo "  -c        Número de caracteres (sobrepõe o valor do perfil)"
        echo "  -i        Número de iterações (sobrepõe o valor do perfil)"
        echo "  -x        Prefixo (sobrepõe o valor do perfil)"
        echo "  -y        Sufixo (sobrepõe o valor do perfil)"
        echo ""
        echo "Exemplo:"
        echo "  $0 -d -f apg-profiles-2025-06-19.json -n GitHub -p 'minhasenhamestra'"
        exit 1
    fi

    if [ ! -f "$JSON_FILE" ]; then
        echo "Erro: arquivo '$JSON_FILE' não encontrado." >&2
        exit 1
    fi

    if ! command -v python3 &>/dev/null; then
        echo "Erro: Python 3 não encontrado. É necessário para descriptografar perfis." >&2
        exit 1
    fi

    if ! python3 -c "from cryptography.hazmat.primitives.ciphers.aead import AESGCM" 2>/dev/null; then
        echo "Erro: pacote 'cryptography' não instalado." >&2
        echo "Instale com: pip install cryptography" >&2
        exit 1
    fi

    # Descriptografa e emite atribuições shell-safe.
    # Dados sensíveis são passados via variáveis de ambiente para não aparecerem
    # no código Python interpolado nem em 'ps aux'.
    PROFILE_VARS=$(APG_PASSKEY="$KEYWORD" APG_FILE="$JSON_FILE" APG_NAME="$PROFILE_NAME" \
    python3 - <<'PYEOF'
import sys, json, base64, hashlib, os, shlex
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

passkey     = os.environ['APG_PASSKEY'].encode('utf-8')
json_file   = os.environ['APG_FILE']
name        = os.environ['APG_NAME']

try:
    with open(json_file, 'r') as f:
        profiles = json.load(f)
except Exception as e:
    print(f"Erro ao ler arquivo: {e}", file=sys.stderr)
    sys.exit(1)

if name not in profiles:
    available = ', '.join(profiles.keys()) or '(nenhum)'
    print(f"Perfil '{name}' não encontrado. Perfis disponíveis: {available}", file=sys.stderr)
    sys.exit(1)

entry = profiles[name]
try:
    salt = base64.b64decode(entry['salt'])
    iv   = base64.b64decode(entry['iv'])
    ct   = base64.b64decode(entry['ct'])
except KeyError as e:
    print(f"Perfil inválido — campo ausente: {e}", file=sys.stderr)
    sys.exit(1)

key = hashlib.pbkdf2_hmac('sha256', passkey, salt, 200000, dklen=32)

try:
    plain = AESGCM(key).decrypt(iv, ct, None)
except Exception:
    print("Erro: palavra-chave incorreta ou perfil corrompido.", file=sys.stderr)
    sys.exit(1)

data = json.loads(plain.decode('utf-8'))
print(f"P_KEYWORD={shlex.quote(data.get('keyword', ''))}")
print(f"P_SERVICE={shlex.quote(data.get('service', ''))}")
print(f"P_NUM_CHARS={shlex.quote(str(data.get('numChars', '')))}")
print(f"P_ITERATIONS={shlex.quote(str(data.get('iterations', '1')))}")
print(f"P_PREFIX={shlex.quote(data.get('prefix', ''))}")
print(f"P_SUFFIX={shlex.quote(data.get('suffix', ''))}")
PYEOF
    )

    [ $? -ne 0 ] && exit 1

    eval "$PROFILE_VARS"

    # Flags CLI sobrepõem o perfil; keyword e salt vêm do perfil
    KEYWORD="${P_KEYWORD:-$KEYWORD}"
    SALT="${P_SERVICE}"
    NUM_CHARS="${NUM_CHARS:-$P_NUM_CHARS}"
    ITERATIONS="${ITERATIONS:-$P_ITERATIONS}"
    PREFIX="${PREFIX:-$P_PREFIX}"
    SUFFIX="${SUFFIX:-$P_SUFFIX}"
    ALGO="sha512"

    echo "Perfil '$PROFILE_NAME' descriptografado com sucesso."
    echo "  Salt/Serviço : ${SALT:-(vazio)}"
    echo "  Caracteres   : ${NUM_CHARS:-(completo)}"
    echo "  Iterações    : ${ITERATIONS:-1}"
    echo "  Prefixo      : ${PREFIX:-(vazio)}"
    echo "  Sufixo       : ${SUFFIX:-(vazio)}"
    echo ""

fi

# ── Modo geração de senha ─────────────────────────────────────────────────────

ITERATIONS=${ITERATIONS:-1}
ALGO=${ALGO:-sha512}

if [ -z "$KEYWORD" ]; then
    echo "Uso: $0 -p <palavra_chave> [-a sha512] [-c <num_caracteres>] [-i <num_iteracoes>] [-s <salt_servico>] [-x <prefixo>] [-y <sufixo>]"
    echo "  -p: Palavra-chave (seed) para gerar a senha (obrigatório)"
    echo "  -a: Algoritmo de hash (opcional, padrão: sha512)"
    echo "  -c: Número de caracteres (opcional, se omitido retorna o hash completo)"
    echo "  -i: Número de iterações (opcional, padrão: 1)"
    echo "  -s: Salt ou identificador do serviço (opcional)"
    echo "  -x: Prefixo (opcional) adicionado ao resultado final"
    echo "  -y: Sufixo (opcional) adicionado ao resultado final"
    echo ""
    echo "Modo descriptografar:"
    echo "  $0 -d -f <arquivo.json> -n <nome_perfil> -p <palavra_chave>"
    echo ""
    echo "Exemplo: $0 -p minha_senha -c 10 -i 5 -s gmail -x '#meu' -y '#sobrenome'"
    exit 1
fi

case $ALGO in
    sha512) HASH_CMD="sha512sum" ;;
    *)
        echo "Algoritmo inválido. Use: sha512" >&2
        exit 1
        ;;
esac

CURRENT_VAL="$KEYWORD"

if [ -n "$SALT" ]; then
    CURRENT_VAL="${CURRENT_VAL}:${SALT}"
fi

for (( i=1; i<=ITERATIONS; i++ )); do
    CURRENT_VAL=$(echo -n "$CURRENT_VAL" | $HASH_CMD | awk '{print $1}')
done

if [ -z "$NUM_CHARS" ]; then
    FINAL_RESULT="$CURRENT_VAL"
else
    FINAL_RESULT=$(echo "$CURRENT_VAL" | cut -c 1-"$NUM_CHARS")
fi

FINAL_OUTPUT="${PREFIX}${FINAL_RESULT}${SUFFIX}"
echo "Passwd: ${FINAL_OUTPUT}"
echo "Length: ${#FINAL_OUTPUT}"
