#!/usr/bin/env node
// Applies supabase/migrations/*.sql (and, with --seed, supabase/seed.sql) directly
// against SUPABASE_DB_URL, tracking what's already been applied in
// public._app_migrations so re-running is a safe no-op. Replaces the old
// "paste each file into the SQL editor by hand" workflow.
//
// Usage:
//   npm run db:migrate            # apply pending migrations only
//   npm run db:migrate -- --seed  # also apply supabase/seed.sql (run once, after
//                                 # signing up in the app — see supabase/seed.sql)
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'
import pg from 'pg'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

for (const file of ['.env.local', '.env']) {
  const filePath = path.join(rootDir, file)
  if (existsSync(filePath)) dotenv.config({ path: filePath })
}

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error(
    'SUPABASE_DB_URL não definido.\n' +
      'Copie a connection string em Project Settings -> Database -> Connect (modo "URI", com a senha do banco)\n' +
      'e defina SUPABASE_DB_URL no seu .env.local.',
  )
  process.exit(1)
}

const migrationsDir = path.join(rootDir, 'supabase', 'migrations')
const seedFile = path.join(rootDir, 'supabase', 'seed.sql')
const shouldSeed = process.argv.includes('--seed')

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })
await client.connect()

async function isApplied(name) {
  const { rows } = await client.query('select 1 from public._app_migrations where name = $1', [name])
  return rows.length > 0
}

async function markApplied(name) {
  await client.query('insert into public._app_migrations (name) values ($1)', [name])
}

async function applySqlFile(name, filePath) {
  const sql = readFileSync(filePath, 'utf8')
  console.log(`Aplicando ${name}...`)
  try {
    await client.query('begin')
    await client.query(sql)
    await markApplied(name)
    await client.query('commit')
  } catch (err) {
    await client.query('rollback')
    throw new Error(`Falha ao aplicar ${name}: ${err instanceof Error ? err.message : err}`)
  }
}

try {
  await client.query(`
    create table if not exists public._app_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  let ranCount = 0
  for (const file of files) {
    if (await isApplied(file)) continue
    await applySqlFile(file, path.join(migrationsDir, file))
    ranCount++
  }
  console.log(ranCount > 0 ? `${ranCount} migração(ões) aplicada(s).` : 'Nenhuma migração pendente.')

  if (shouldSeed) {
    if (await isApplied('seed.sql')) {
      console.log('seed.sql já foi aplicado antes — pulando. (Apague a linha correspondente em public._app_migrations para reaplicar.)')
    } else {
      await applySqlFile('seed.sql', seedFile)
      console.log('seed.sql aplicado.')
    }
  }
} finally {
  await client.end()
}
