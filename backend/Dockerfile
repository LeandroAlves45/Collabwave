# ------------------------------------------------------------
# BASE
# ------------------------------------------------------------
# Imagem base partilhada pelos dois stages.
# node:20-alpine usa Alpine Linux — uma distribuição minimalista
# (~5MB vs ~200MB do Ubuntu) que reduz o tamanho final da imagem.

FROM node:20-alpine AS base

# Define o diretório de trabalho dentro do container.
WORKDIR /app

# Copia os arquivos de configuração do projeto para o container.
COPY package.json package-lock.json ./

# ------------------------------------------------------------
# DEVELOPMENT
# ------------------------------------------------------------

FROM base AS development

# Instala as dependências do projeto.
RUN npm ci

# Copia o restante do código-fonte para o container.
COPY . .

# Expõe a porta onde o servidor Express/Socket.io estará escutando.
EXPOSE 3001

# Comando para iniciar o servidor em modo de desenvolvimento.
CMD ["npm", "run", "dev"]

# ------------------------------------------------------------
# BUILDER
# ------------------------------------------------------------

FROM base AS builder

# Instala as dependências do projeto.
RUN npm ci

# Copia o restante do código-fonte para o container.
COPY . .

# Compila o código TypeScript para JavaScript.
RUN npm run build

# ------------------------------------------------------------
# PRODUCTION
# ------------------------------------------------------------

FROM node:20-alpine AS production

WORKDIR /app

# Copia os ficheiros de dependências
COPY package.json package-lock.json ./

# Instala apenas as dependências de produção.
RUN npm ci --omit=dev

# Copia os ficheiros compilados do stage de builder
COPY --from=builder /app/dist ./dist

# Cria um utilizador não-root para correr a aplicação de forma mais segura.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3001 

# Em produção, corre o JavaScript compilado directamente com Node
CMD ["npm", "run", "start:deploy"]
