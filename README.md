# Portfólio Moises Gomes

Projeto React/Vite criado para uma landing page única, responsiva e com carrosséis de imagens.

## Como rodar

### Jeito mais simples

Abra um terminal em `D:\Moises\portfolio-site` e rode:

```powershell
.\run-dev.cmd
```

Depois acesse `http://127.0.0.1:5173`.

### Com npm manual

Se preferir rodar manualmente no PowerShell:

```powershell
$env:PATH = 'D:\Moises\.tools\node-v25.9.0-win-x64;' + $env:PATH
Set-Location 'D:\Moises\portfolio-site'
& 'D:\Moises\.tools\node-v25.9.0-win-x64\npm.cmd' run dev
```

## Onde editar

- Textos, links, marcas, WhatsApp e projetos: `src/data/portfolio.ts`.
- Imagens: `public/assets/projects`.
- Estilos visuais: `src/styles.css`.

As seções de métricas, depoimentos e ferramentas estão preparadas em `src/data/portfolio.ts`, mas devem receber apenas informações reais. Enquanto não houver dados confirmados, mantenha como bloco de sugestão ou desative no app.

## Admin com Supabase

1. Crie um projeto no Supabase e rode `supabase/schema.sql` no SQL editor.
2. Crie um usuario em Authentication com o e-mail que ficara em `VITE_ADMIN_EMAIL`.
3. Insira o `id` desse usuario em `public.admin_users`.
4. Configure o ambiente do frontend:

```powershell
$env:VITE_SUPABASE_URL = 'https://SEU-PROJETO.supabase.co'
$env:VITE_SUPABASE_PUBLISHABLE_KEY = 'SUA_PUBLISHABLE_KEY'
$env:VITE_ADMIN_EMAIL = 'admin@seudominio.com'
```

5. Para popular o Supabase com os dados e arquivos atuais:

```powershell
$env:SUPABASE_URL = $env:VITE_SUPABASE_URL
$env:SUPABASE_SERVICE_ROLE_KEY = 'SUA_SERVICE_ROLE_KEY'
& 'D:\Moises\.tools\node-v25.9.0-win-x64\npm.cmd' run seed:supabase
```

A home usa Supabase quando estiver configurado e volta para `src/data/portfolio.ts` se a conexao falhar. O painel fica em `/admin.html`.
