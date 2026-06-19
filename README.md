# Amnesia Pass Generator

Um gerador de senhas determinístico baseado em hash SHA512 iterativo. Dado uma palavra-chave e um salt por serviço, a mesma senha é sempre reproduzida sem precisar armazená-la.

Este repositório inclui duas implementações independentes do mesmo algoritmo:

- `amnesiapassgen.sh` — CLI em Bash usando `sha512sum` do coreutils.
- `docs/` — Aplicação web estática (vanilla JS + CryptoJS), publicada via GitHub Pages e instalável como PWA offline.

**GitHub Page:** [AmnesiaPassGenerator](https://brandonalmeida.github.io/AmnesiaPassGenerator)

---

## Como funciona

1. Concatena a palavra-chave com o salt do serviço no formato `keyword:salt` (se salt for fornecido).
2. Calcula SHA512 do resultado e re-hasha o hex digest por N iterações.
3. Trunca o hash final para o número de caracteres desejado (ou retorna o hash completo).
4. Aplica prefixo e sufixo opcionais ao resultado.

O processo é determinístico: os mesmos parâmetros sempre produzem a mesma saída.

---

## CLI — Uso

```bash
./amnesiapassgen.sh -p <palavra_chave> -a sha512 [-c <num_caracteres>] [-i <num_iteracoes>] [-s <salt_servico>] [-x <prefixo>] [-y <sufixo>]
```

### Parâmetros

| Flag | Descrição | Obrigatório |
|------|-----------|-------------|
| `-p` | Palavra-chave (seed mestra) | Sim |
| `-a` | Algoritmo — apenas `sha512` | Sim |
| `-c` | Comprimento da senha final (sem valor = hash completo) | Não |
| `-i` | Número de iterações (padrão: `1`) | Não |
| `-s` | Salt / identificador do serviço (ex.: `github`, `gmail`) | Não |
| `-x` | Prefixo adicionado ao resultado final | Não |
| `-y` | Sufixo adicionado ao resultado final | Não |

### Exemplos

Senha de 40 caracteres com 10 iterações e salt de serviço:

```bash
./amnesiapassgen.sh -p "minhasenhasecreta" -a sha512 -c 40 -i 10 -s "github" -x "#T" -y "#"
```

Hash completo (sem truncamento), iteração padrão:

```bash
./amnesiapassgen.sh -p "minhasenhasecreta" -a sha512 -s "email"
```

Para não gravar a palavra-chave no histórico do Bash (`HISTCONTROL=ignoreboth` no `~/.bashrc`), inicie o comando com um espaço:

```bash
 ./amnesiapassgen.sh -p "minhasenhasecreta" -c 32 -i 5 -s "banco"
```

### Descriptografar perfis exportados da versão web

O script pode ler o arquivo `.json` exportado pela versão web, descriptografar um perfil e gerar a senha correspondente em um único comando:

```bash
./amnesiapassgen.sh -d -f apg-profiles-2025-06-19.json -n "GitHub" -p "minhasenhamestra"
```

**Flags do modo descriptografar:**

| Flag | Descrição | Obrigatório |
|------|-----------|-------------|
| `-d` | Ativa o modo de descriptografia | Sim |
| `-f` | Caminho para o arquivo `.json` exportado | Sim |
| `-n` | Nome do perfil a descriptografar | Sim |
| `-p` | Palavra-chave usada ao salvar o perfil na web | Sim |
| `-c` `-i` `-x` `-y` | Sobrepõem os valores do perfil, se necessário | Não |

Saída de exemplo:

```
Perfil 'GitHub' descriptografado com sucesso.
  Salt/Serviço : github
  Caracteres   : 40
  Iterações    : 10
  Prefixo      : #T
  Sufixo       : #

Passwd: #T3a9f...c12e#
Length: 44
```

**Requisitos adicionais para o modo descriptografar:**
- Python 3
- Pacote `cryptography`: `pip install cryptography`

### Requisitos

- Bash
- Coreutils (`sha512sum`)
- Python 3 + `pip install cryptography` *(somente para descriptografar perfis)*

---

## Versão Web (GitHub Pages + PWA)

A aplicação web está em `docs/` e pode ser publicada no GitHub Pages. Funciona 100% no navegador — nenhum dado é enviado a servidores. Instalável como app offline via PWA.

### Recursos

- Geração de senha idêntica ao CLI (mesmo algoritmo SHA512 iterativo).
- Todos os campos sensíveis têm toggle show/hide.
- Instalável como PWA (modo standalone, uso offline via Service Worker).
- CryptoJS carregado localmente — sem dependência de CDN para a geração de senhas.

### Perfis Salvos

A versão web permite salvar e carregar configurações de senha (perfis) diretamente no `localStorage` do navegador, com criptografia de ponta a ponta.

**O que é salvo:** palavra-chave, salt, número de caracteres, iterações, prefixo, sufixo — tudo cifrado. Nenhum dado sensível fica em texto claro no armazenamento.

**Criptografia usada:**
- Derivação de chave: **PBKDF2** (SHA-256, 200.000 iterações, salt aleatório de 16 bytes por perfil)
- Cifra: **AES-GCM-256** (nonce aleatório de 12 bytes por salvamento)
- A tag de autenticação do GCM garante integridade — uma palavra-chave errada resulta em falha de autenticação, sem vazar dados

**Fluxo de uso:**

1. Preencha o formulário com todos os campos desejados, incluindo a palavra-chave.
2. Clique em **Salvar Perfil Atual** e dê um nome ao perfil.
3. Posteriormente, selecione o perfil no dropdown e clique em **Carregar**.
4. Insira a palavra-chave no modal de descriptografia — todos os campos são restaurados automaticamente.

**Import / Export:**

Os perfis podem ser exportados para um arquivo `.json` (os blobs permanecem cifrados, sem exposição de dados sensíveis) e importados em outro dispositivo ou navegador. Em caso de conflito de nomes, é possível sobrescrever ou ignorar os perfis existentes individualmente.

### Como publicar no GitHub Pages

1. No GitHub, vá em **Settings → Pages**.
2. Em **Source**, selecione **Deploy from a branch**.
3. Em **Branch**, selecione `main` e a pasta `/docs`.
4. Salve e aguarde o link do site.

### Como instalar no Android (Chrome)

1. Acesse o site publicado via HTTPS.
2. No menu do Chrome, toque em **Instalar app**.
3. O app será adicionado à tela inicial em modo standalone.

---

## Boas práticas

- Use uma palavra-chave longa e não óbvia (frase completa, não uma palavra).
- Use um salt diferente para cada serviço — evita que a mesma senha base seja reutilizada diretamente.
- A palavra-chave é o ponto único de falha: se for descoberta, todas as senhas derivadas ficam expostas.
- Ao usar o CLI, evite expor a palavra-chave no histórico do terminal ou em clipboards de apps não confiáveis.
