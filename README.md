# bottom-gear
Projeto para aula eletiva de 2026_1
# 🏎️ Top Racer Clone (Project Nitro)

Um jogo de corrida arcade retrô desenvolvido para a web, inspirado nos clássicos do SNES como *Top Racer* e *Lotus Turbo Challenge*. Este projeto utiliza técnicas de renderização pseudo-3D (raster effect) para simular profundidade em um ambiente 2D.

---

## 🎮 Sobre o Jogo

O **Project Nitro** é um simulador de corrida focado na estética 16-bit. O objetivo é completar 3 voltas no menor tempo possível, desviando de adversários e gerenciando o uso de Nitros em retas estratégicas.

### Funcionalidades Principais:
* **Pseudo-3D Engine:** Renderização por linhas horizontais (Raster) via HTML5 Canvas.
* **Física Arcade:** Curvas que exigem compensação de direção e redução de velocidade na grama.
* **Sistema de Nitro:** Aceleração temporária limitada.
* **Estética Retrô:** Sprites em pixel art e trilha sonora inspirada em sintetizadores dos anos 90.

---

## 🛠️ Tecnologias Utilizadas

* **Linguagem:** JavaScript (ES6+) / HTML5 / CSS3
* **Renderização:** HTML5 Canvas API
* **Versionamento:** Git & GitHub Desktop
* **Engine Conceitual:** Google Antigravity (Ambiente de desenvolvimento)

---

## 📂 Estrutura do Repositório

```text
/top-racer-clone
├── /assets             # Sprites, SFX e Músicas
├── /src                # Código-fonte (Lógica da Pista, Carro e IA)
│   ├── main.js         # Loop principal e inicialização
│   ├── render.js       # Matemática do efeito Pseudo-3D
│   └── input.js        # Mapeamento do teclado
├── index.html          # Ponto de entrada do jogo
└── README.md           # Documentação do projeto
```

🚀 Como Executar o Projeto

Como o jogo é baseado em tecnologias web nativas, você não precisa de um servidor complexo para a versão de desenvolvimento:

    Clone o repositório:
    Bash

    git clone [https://github.com/seu-usuario/top-racer-clone.git](https://github.com/seu-usuario/top-racer-clone.git)

    Abra o projeto:

        Navegue até a pasta do projeto.

        Abra o arquivo index.html em qualquer navegador moderno (Chrome, Firefox, Edge).

    Dica de Desenvolvimento:

        Recomenda-se o uso da extensão Live Server no VS Code para visualizar as alterações em tempo real.

🕹️ Controles
Tecla	Ação
Seta Cima / W	Acelerar
Seta Baixo / S	Frear / Ré
Seta Esq/Dir / A/D	Virar o Volante
Espaço / Shift	Ativar NITRO ⚡
📝 Licença

Este projeto está sob a licença MIT. Consulte o arquivo LICENSE para mais detalhes.