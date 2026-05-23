# ONLYBUILDINGS

> Nothing but buildings. Submit yours.

A zero-friction anonymous photo grid of buildings. Drop a photo, AI confirms it's a building, it appears on the grid. No accounts, no usernames, no likes. Just buildings.

---

## Stack

| Layer | Service | Free tier |
|-------|---------|-----------|
| Hosting + Functions | [Netlify](https://netlify.com) | ✅ generous |
| Image storage | [Cloudinary](https://cloudinary.com) | ✅ 25GB |
| Database (photo URLs) | [Supabase](https://supabase.com) | ✅ 500MB |
| AI verification | [Anthropic Claude](https://anthropic.com) | pay-per-use (tiny cost) |

---

## Setup (one-time, ~15 mins)

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run:

```sql
create table photos (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  submitted_at timestamptz default now()
);

-- Allow public reads, no public writes (functions use service key)
alter table photos enable row level security;
create policy "Public read" on photos for select using (true);
```

3. Copy your **Project URL** and **service_role key** from Settings → API.

### 2. Cloudinary

1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. Go to **Settings → Upload → Upload presets**
3. Create an **unsigned** preset, name it something like `onlybuildings`
4. Copy your **Cloud Name**

### 3. Anthropic

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)

### 4. GitHub

Push this repo to GitHub:

```bash
git init
git add .
git commit -m "initial commit"
gh repo create onlybuildings --public --push
# or use github.com to create the repo and push manually
```

### 5. Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. Connect your GitHub repo
3. Build settings are auto-detected from `netlify.toml` (publish: `public`, functions: `netlify/functions`)
4. Go to **Site settings → Environment variables** and add:

| Key | Value |
|-----|-------|
| `ANTHROPIC_API_KEY` | your Anthropic key |
| `SUPABASE_URL` | your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | your Supabase service_role key |
| `CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud name |
| `CLOUDINARY_UPLOAD_PRESET` | your unsigned upload preset name |

5. Trigger a redeploy — you're live.

---

## How it works

```
User selects photo
       ↓
POST /.netlify/functions/verify
  → Claude Vision checks if it's a building
       ↓ yes            ↓ no
POST /.netlify/functions/upload    Show error
  → Upload to Cloudinary
  → Save URL to Supabase
       ↓
Photo appears in grid immediately
```

## Local development

```bash
npm install
# create .env with all 5 env vars above
npx netlify dev
```

---

## Customize

- **Grid columns**: edit `columns: 4 240px` in `style.css`
- **Max photos loaded**: change `.limit(200)` in `photos.js`
- **AI strictness**: tweak the prompt in `verify.js`
- **Cache time**: change `max-age=30` in `photos.js`

---

*No usernames. No likes. No follows. Just buildings.*
