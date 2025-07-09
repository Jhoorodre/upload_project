# Deploy para GitHub Pages

## Pré-requisitos

1. **Git configurado** com seu usuário GitHub
2. **Repositório no GitHub** criado
3. **Node.js e npm** instalados

## Passos para Deploy

### 1. Instalar dependências de deploy
```bash
npm install --save-dev gh-pages
```

### 2. Configurar o homepage no package.json
Edite o `package.json` e substitua `SEU_USUARIO` pelo seu nome de usuário GitHub:
```json
"homepage": "https://SEU_USUARIO.github.io/manga-uploader-frontend",
```

### 3. Criar repositório no GitHub
1. Vá para [GitHub.com](https://github.com)
2. Crie um novo repositório chamado `manga-uploader-frontend`
3. **NÃO** inicialize com README, .gitignore ou licença

### 4. Conectar projeto local com repositório
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/manga-uploader-frontend.git
git push -u origin main
```

### 5. Configurar GitHub Pages
1. Vá para **Settings** do repositório
2. Clique em **Pages** no menu lateral
3. Em **Source**, selecione **GitHub Actions**

### 6. Deploy automático
O deploy acontece automaticamente quando você faz push para a branch `main`.

### 7. Deploy manual (alternativa)
```bash
npm run deploy
```

## Acesso à aplicação

Após o deploy, sua aplicação estará disponível em:
`https://SEU_USUARIO.github.io/manga-uploader-frontend`

## Atualizar a aplicação

1. Faça as alterações no código
2. Commit e push:
```bash
git add .
git commit -m "Descrição das alterações"
git push
```

O deploy automático será executado e a aplicação será atualizada em alguns minutos.

## Problemas comuns

### CORS Error
- ✅ **Resolvido**: GitHub Pages usa HTTPS, eliminando problemas de CORS
- ✅ **Catbox funcionará normalmente** em produção

### Build Error
- Verifique se todas as dependências estão instaladas
- Execute `npm run build` localmente para testar

### 404 Error
- Verifique se o `homepage` no package.json está correto
- Verifique se o repositório está público