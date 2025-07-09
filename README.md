# Manga Upload Manager

Sistema distribuído para upload e gerenciamento de mangás com múltiplos hosts de imagem.

## Funcionalidades

- **Upload Distribuído**: Suporte para Catbox, ImgBB e Imgur
- **Estratégias de Upload**: Single host, round-robin e redundante
- **Compressão de Imagens**: Otimização automática com configuração flexível
- **Integração GitHub**: Índice automático de mangás em repositório GitHub
- **Interface Moderna**: React com TypeScript e Tailwind CSS
- **Gerenciamento de Estado**: Contextos React para configuração e upload
- **Notificações**: Sistema de feedback em tempo real

## Instalação

```bash
# Instalar dependências
npm install

# Iniciar aplicação (desenvolvimento)
npm start

# Build para produção
npm run build

# Deploy para GitHub Pages
npm run deploy
```

## Configuração

1. **GitHub**: Configure seu Personal Access Token, owner, repo e filename
2. **Hosts de Imagem**: Configure as APIs dos hosts que deseja usar
3. **Estratégias**: Escolha entre single_host, round_robin ou redundant
4. **Compressão**: Ajuste qualidade e dimensões máximas

## Uso

1. Configure os hosts de imagem na aba "Configuração"
2. Preencha as informações do mangá e capítulo
3. Selecione os arquivos de imagem
4. Clique em "Iniciar Upload"
5. Acompanhe o progresso em tempo real

## Estrutura do Projeto

```
src/
├── components/         # Componentes reutilizáveis
├── contexts/          # React Contexts
├── hooks/             # Custom hooks
├── services/          # Serviços de upload e GitHub
├── types/             # Definições TypeScript
├── utils/             # Utilitários e validações
├── App.tsx            # Componente principal
├── MangaUploader.tsx  # Componente principal do uploader
└── index.tsx          # Entry point
```

## Deploy

### GitHub Pages (Recomendado)
1. Edite o `homepage` no `package.json` com seu usuário GitHub
2. Crie um repositório no GitHub
3. Siga as instruções no arquivo `DEPLOY.md`
4. A aplicação ficará disponível em: `https://SEU_USUARIO.github.io/manga-uploader-frontend`

### Vantagens do GitHub Pages
- ✅ **HTTPS nativo** - resolve problemas de CORS
- ✅ **Catbox funciona perfeitamente** em produção
- ✅ **Deploy automático** com GitHub Actions
- ✅ **Gratuito** para repositórios públicos

## Tecnologias

- React 18 com TypeScript
- Tailwind CSS para estilização
- Contextos React para gerenciamento de estado
- Fetch API para requisições HTTP
- Canvas API para compressão de imagens
- GitHub Pages para deploy
- GitHub Actions para CI/CD