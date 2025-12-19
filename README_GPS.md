# 🚴 CyclerRoute - GPS Real para Ciclistas

## 📋 Sobre o Projeto

PWA (Progressive Web App) de GPS real para ciclistas, permitindo criar, salvar e percorrer rotas com navegação em tempo real.

### ✨ Características Principais

- ✅ **Rotas Reais**: Utiliza OSRM (Open Source Routing Machine) para gerar rotas seguindo ruas e ciclovias
- ✅ **GPS em Tempo Real**: Navegação com acompanhamento da posição do usuário
- ✅ **Funciona Offline**: Rotas salvas disponíveis sem conexão
- ✅ **Tema Dark**: Interface moderna com verde neon (#32FF7E)
- ✅ **Sem Backend**: Tudo funciona no navegador usando IndexedDB

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura
- **CSS3** - Estilização (Dark Theme)
- **JavaScript Vanilla** - Lógica (ES6+ Modules)
- **Leaflet.js** - Renderização de mapas
- **Leaflet Routing Machine** - Cálculo de rotas
- **OpenStreetMap** - Tiles de mapa
- **OSRM** - Motor de rotas (https://router.project-osrm.org)
- **IndexedDB** - Armazenamento local
- **Service Worker** - Cache e funcionalidade offline

## 🚀 Como Usar

### 1. Executar Localmente

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/CyclerRoute.git

# Entre na pasta
cd CyclerRoute

# Inicie um servidor local (Python)
python -m http.server 8000

# Ou usando Node.js
npx http-server -p 8000

# Acesse no navegador
http://localhost:8000
```

### 2. Funcionalidades

#### 🏠 Tela Home
- Mapa centralizado no usuário
- Botões: **Criar Rota** e **Minhas Rotas**

#### ➕ Criar Rota
1. Clique em "Criar Rota"
2. Clique no mapa para definir pontos:
   - **1º clique**: Ponto inicial (verde)
   - **2º clique**: Ponto final (vermelho)
   - **Cliques adicionais**: Waypoints intermediários (azul)
3. O app calcula automaticamente a rota via OSRM
4. Visualize distância e tempo estimado
5. Clique em "Salvar" e dê um nome à rota

#### 📋 Minhas Rotas
- Lista todas as rotas salvas
- Informações: nome, distância, tempo, data
- Botões: **Abrir** e **Excluir**

#### 🗺️ Visualizar Rota
- Exibe a rota no mapa
- Mostra informações detalhadas
- Botão: **Percorrer Rota**

#### 🧭 Percorrer Rota (Modo GPS)
- Ativa o GPS do dispositivo
- Centraliza mapa na posição do usuário
- Mostra em tempo real:
  - Distância restante
  - Velocidade atual
  - Tempo decorrido
- **Alertas**:
  - ⚠️ Fora da rota (> 50m de distância)
  - ✅ De volta à rota
  - 🎉 Rota concluída (< 20m do destino)

## 📱 Instalação como PWA

1. Abra o app no navegador (Chrome/Edge recomendado)
2. Clique no ícone de instalação na barra de endereço
3. Ou em "Menu > Instalar CyclerRoute"
4. O app funcionará como aplicativo nativo

## 💾 Estrutura de Dados

### Rota Salva (IndexedDB)
```json
{
  "id": "route_1234567890_abc123",
  "name": "Rota Centro-Parque",
  "description": "Rota para pedalar até o parque",
  "waypoints": [
    { "lat": -23.5505, "lng": -46.6333 },
    { "lat": -23.5550, "lng": -46.6400 }
  ],
  "distance": 5420,
  "duration": 1080,
  "createdAt": "2025-12-18T10:30:00.000Z"
}
```

## 🎨 Tema Visual

- **Background**: `#0B0F0E` (Preto esverdeado)
- **Primary**: `#32FF7E` (Verde neon)
- **Text**: `#EAEAEA` (Branco suave)
- **Rota**: Verde neon com opacity 0.8

## 📂 Estrutura de Arquivos

```
CyclerRoute/
├── index.html                      # HTML principal
├── manifest.json                   # PWA manifest
├── service-worker.js               # Service worker para offline
├── assets/
│   ├── css/
│   │   └── styles.css             # CSS tema dark
│   └── icons/
│       └── icon.svg               # Ícone do app
└── src/
    ├── app.js                     # App principal
    ├── splash-screen.js           # Splash screen
    ├── storage/
    │   └── db.js                  # IndexedDB wrapper
    └── map/
        ├── route-creator-osrm.js  # Criação de rotas com OSRM
        └── gps-navigator.js       # Navegação GPS
```

## 🔧 Configurações Técnicas

### OSRM
- **URL**: `https://router.project-osrm.org/route/v1`
- **Profile**: `bike` (otimizado para bicicletas)
- **Sem limite de requisições** (servidor público)

### GPS
- **Precisão**: High accuracy
- **Timeout**: 10 segundos
- **Distância da rota**: Alerta se > 50 metros
- **Destino alcançado**: < 20 metros

### Cache (Service Worker)
- **Tiles do mapa**: Cache-first (performance)
- **Rotas OSRM**: Sempre da rede (não cachear)
- **Assets estáticos**: Network-first com fallback

## 🌐 Compatibilidade

- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS/Android)

## 📝 Limitações Conhecidas

1. **Tiles offline**: Mapa não funcionará 100% offline (dependente do cache do navegador)
2. **GPS necessário**: Para modo de navegação
3. **Permissão de localização**: Usuário deve autorizar
4. **OSRM público**: Sem garantias de SLA

## 🐛 Troubleshooting

### Problema: Rota não é calculada
- ✓ Verifique conexão com internet
- ✓ Tente pontos mais próximos de ruas/ciclovias
- ✓ Verifique console do navegador (F12)

### Problema: GPS não funciona
- ✓ Autorize permissão de localização no navegador
- ✓ Verifique se GPS do dispositivo está ativo
- ✓ Use HTTPS (necessário para Geolocation API)

### Problema: App não salva rotas
- ✓ Verifique se IndexedDB está habilitado no navegador
- ✓ Limpe cache do site
- ✓ Tente em modo anônimo

## 📄 Licença

MIT License - Use livremente!

## 🤝 Contribuições

Pull requests são bem-vindos! Para mudanças maiores, abra uma issue primeiro.

## 📧 Contato

- GitHub: [@seu-usuario](https://github.com/seu-usuario)
- Email: seu-email@exemplo.com

---

**Desenvolvido com ❤️ para ciclistas** 🚴‍♂️
