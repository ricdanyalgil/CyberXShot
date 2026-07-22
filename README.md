<p align="center"><img src="build/icon.png" width="120" alt="CyberXShot" /></p>

# CyberXShot

Captura de tela rápida, editável e multiplataforma para macOS e Windows.

O CyberXShot é uma implementação original e open source inspirada no fluxo simples do Lightshot: pressione um atalho, selecione uma área, anote e copie, salve ou compartilhe. O projeto não é afiliado ao Lightshot, Skillbrains ou prntscr.com.

## Funcionalidades

- Captura da tela sob o cursor com seleção livre de área.
- Atalho global `⌘/Ctrl + Shift + X` e `Print Screen` no Windows.
- Acesso pela bandeja do sistema e inicialização opcional com o sistema.
- Editor imediato com caneta, linha, seta, retângulo, destaque, texto e desfoque.
- Desfazer/refazer e escolha de cor/espessura.
- Copiar para a área de transferência ou salvar em PNG.
- Link público temporário de 1 hora, copiado automaticamente.
- Pesquisa da seleção no Google Lens.
- Interface em português, isolada com `contextIsolation` e sem acesso Node no renderer.

## Privacidade

Capturas permanecem no computador por padrão. Somente os botões **Compartilhar** ou **Pesquisar imagem** enviam a seleção ao serviço público temporário [Litterbox](https://litterbox.catbox.moe/); o arquivo expira em uma hora. Não envie dados sensíveis.

## Desenvolvimento

Requisitos: Node.js 22.12+ e npm 10+.

```bash
npm install
npm run dev
```

Outros comandos:

```bash
npm test          # testes automatizados
npm run build     # valida TypeScript e gera o frontend
npm run dist:mac  # .dmg e .zip para macOS
npm run dist:win  # instalador NSIS e versão portátil para Windows
```

No macOS, autorize **Gravação da Tela** em Ajustes do Sistema → Privacidade e Segurança quando solicitado. O aplicativo precisa ser recompilado em cada sistema operacional; o workflow de release faz isso automaticamente.

## Arquitetura

- `electron/main.cts`: janelas, captura nativa, atalho, bandeja, clipboard, arquivos e upload.
- `electron/preload.cts`: ponte IPC mínima e tipada.
- `src/components/CaptureEditor.tsx`: seleção e ferramentas do editor.
- `src/utils/exportImage.ts`: composição e exportação da imagem final.
- React + TypeScript + Vite no renderer; Electron Builder para distribuição.

## Distribuição

Crie uma tag como `v0.1.0` e envie ao GitHub. O workflow gera os artefatos para macOS (Intel/Apple Silicon) e Windows e os anexa a uma release. Para distribuição pública sem alertas do sistema, configure certificados Apple Developer ID e Windows Code Signing. O build aberto usa assinatura ad hoc (`identity: "-"`); substitua essa opção ao configurar a assinatura oficial.

## Roadmap

- Histórico local opcional de capturas.
- Upload configurável/self-hosted.
- Seleção de janela e monitor pelo teclado.
- Assinatura e atualização automática dos binários.

Contribuições são bem-vindas. Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[MIT](LICENSE)
