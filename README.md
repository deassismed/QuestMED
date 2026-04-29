# QuestMED

Protótipo web mobile para resolução diária de questões de medicina.

## Como publicar no GitHub Pages sem arquivos com ponto

1. Rode o build local:

   ```bash
   npm install
   npm run build
   ```

2. Envie para o GitHub estes arquivos e pastas:

   - `docs`
   - `src`
   - `index.html`
   - `package.json`
   - `package-lock.json`
   - `tsconfig.json`
   - `tsconfig.app.json`
   - `tsconfig.node.json`
   - `vite.config.ts`
   - `README.md`

3. No GitHub, abra `Settings > Pages`.

4. Em `Build and deployment`, escolha:

   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/docs`

5. Clique em `Save`.

Depois disso, o GitHub Pages vai servir a versão pronta que está dentro da pasta `docs`.

Não é necessário enviar `.github`, `.gitignore`, `node_modules`, `dist` ou arquivos `.log`.
