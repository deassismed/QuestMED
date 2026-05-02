# QuestMED

Protótipo web mobile para resolução diária de questões de medicina.

## EstatÃ­sticas diÃ¡rias com Supabase

O app envia eventos anÃ´nimos de resoluÃ§Ã£o de questÃµes para o Supabase quando as variÃ¡veis abaixo estÃ£o configuradas:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Para criar a tabela, as polÃ­ticas de inserÃ§Ã£o anÃ´nima e a view de resumo diÃ¡rio, execute o SQL em `supabase/question-events.sql` no SQL Editor do Supabase.

Configure essas variÃ¡veis antes de rodar `npm run build`, porque o Vite grava esses valores no bundle estÃ¡tico publicado em `docs`.

Sem essas variÃ¡veis, o app continua funcionando normalmente e nÃ£o tenta enviar estatÃ­sticas.

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
