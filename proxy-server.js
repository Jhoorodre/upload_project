const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Habilitar CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Proxy para Catbox
app.use('/api/catbox', createProxyMiddleware({
  target: 'https://catbox.moe',
  changeOrigin: true,
  pathRewrite: {
    '^/api/catbox': '/user/api.php'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Adicionar headers necessários
    proxyReq.setHeader('Origin', 'https://catbox.moe');
    proxyReq.setHeader('Referer', 'https://catbox.moe');
  }
}));

// Proxy para ImgBB
app.use('/api/imgbb', createProxyMiddleware({
  target: 'https://api.imgbb.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/imgbb': '/1/upload'
  }
}));

// Proxy para Imgur
app.use('/api/imgur', createProxyMiddleware({
  target: 'https://api.imgur.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api/imgur': '/3/image'
  }
}));

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});