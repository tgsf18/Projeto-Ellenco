import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repositoryRoot = path.resolve(frontendRoot, '..')
const dist = path.join(frontendRoot, 'dist')
const expectedTarget = path.resolve(repositoryRoot, 'backend', 'src', 'main', 'resources', 'static')

if (!existsSync(path.join(dist, 'index.html'))) {
  throw new Error('Build do frontend não encontrado. Execute npm run build antes da cópia.')
}

const target = path.resolve(repositoryRoot, 'backend', 'src', 'main', 'resources', 'static')
if (target !== expectedTarget || !target.startsWith(`${repositoryRoot}${path.sep}`)) {
  throw new Error('Destino de publicação está fora do repositório esperado; cópia cancelada.')
}

mkdirSync(path.dirname(target), { recursive: true })
if (existsSync(target) && realpathSync(target) !== target) {
  throw new Error('O diretório static é um link ou junction; cópia cancelada para evitar sobrescrever outro destino.')
}
if (existsSync(target)) rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })
cpSync(dist, target, { recursive: true })
const indexFile = path.join(target, 'index.html')
writeFileSync(indexFile, readFileSync(indexFile, 'utf8').replace(/\r\n/g, '\n'))
console.log(`Frontend copiado para ${path.relative(repositoryRoot, target)}.`)
