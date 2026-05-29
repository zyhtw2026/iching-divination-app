/**
 * 從教育部常用國字筆劃 XML（zh-stroke-data-master）產生筆畫對照表。
 *
 * 用法：
 *   node scripts/build-moe-strokes.mjs
 *   node scripts/build-moe-strokes.mjs --input /path/to/zh-stroke-data-master/data
 *   node scripts/build-moe-strokes.mjs --output public/data/moe-strokes.json
 *
 * 每個 XML：
 *   - 檔名為 Big5 十六進位（如 a440.xml → 一）
 *   - 或 <Word unicode="愛"> 屬性
 *   - 筆畫數 = <Stroke> 標籤個數
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { TextDecoder } from 'util'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

const DEFAULT_INPUT = resolve(
  process.env.ZH_STROKE_DATA_DIR ??
    join(PROJECT_ROOT, '../zh-stroke-data-master/data'),
)
const DEFAULT_OUTPUT = join(PROJECT_ROOT, 'public/data/moe-strokes.json')

const big5Decoder = new TextDecoder('big5')

function parseArgs(argv) {
  let input = DEFAULT_INPUT
  let output = DEFAULT_OUTPUT
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1]) {
      input = resolve(argv[++i])
    } else if (argv[i] === '--output' && argv[i + 1]) {
      output = resolve(argv[++i])
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log(`Usage: node scripts/build-moe-strokes.mjs [--input DIR] [--output FILE]`)
      process.exit(0)
    }
  }
  return { input, output }
}

/** 檔名 a440.xml → Big5 解碼為一字 */
function charFromBig5Filename(filename) {
  const hex = filename.replace(/\.xml$/i, '')
  if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
    return null
  }
  try {
    const char = big5Decoder.decode(Buffer.from(hex.toLowerCase(), 'hex'))
    if (!char || char === '\uFFFD') {
      return null
    }
    return char
  } catch {
    return null
  }
}

function charFromXml(xml) {
  const match = xml.match(/<Word[^>]*\sunicode="([^"]+)"/)
  return match ? match[1] : null
}

function countStrokes(xml) {
  return (xml.match(/<Stroke>/g) ?? []).length
}

function buildStrokeMap(dataDir) {
  const files = readdirSync(dataDir).filter((name) => name.toLowerCase().endsWith('.xml'))
  const strokesByChar = Object.create(null)
  const skipped = []

  for (const filename of files) {
    const filePath = join(dataDir, filename)
    const xml = readFileSync(filePath, 'utf8')
    const strokes = countStrokes(xml)

    if (strokes === 0) {
      skipped.push({ filename, reason: 'no strokes' })
      continue
    }

    const char = charFromXml(xml) ?? charFromBig5Filename(filename)
    if (!char) {
      skipped.push({ filename, reason: 'no character' })
      continue
    }

    if (strokesByChar[char] !== undefined && strokesByChar[char] !== strokes) {
      console.warn(
        `警告：「${char}」筆畫不一致（已有 ${strokesByChar[char]}，${filename} 為 ${strokes}）`,
      )
    }

    strokesByChar[char] = strokes
  }

  return { strokesByChar, skipped, fileCount: files.length }
}

function sortObjectByKey(obj) {
  return Object.fromEntries(
    Object.keys(obj)
      .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
      .map((key) => [key, obj[key]]),
  )
}

function main() {
  const { input, output } = parseArgs(process.argv)

  let entries
  try {
    entries = readdirSync(input)
  } catch {
    console.error(`找不到資料目錄：${input}`)
    console.error('請設定 --input 或環境變數 ZH_STROKE_DATA_DIR')
    process.exit(1)
  }
  if (!entries.some((name) => name.toLowerCase().endsWith('.xml'))) {
    console.error(`目錄內沒有 XML 檔：${input}`)
    process.exit(1)
  }

  const { strokesByChar, skipped, fileCount } = buildStrokeMap(input)
  const sorted = sortObjectByKey(strokesByChar)
  const charCount = Object.keys(sorted).length

  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')

  console.log(`已讀取 ${fileCount} 個 XML`)
  console.log(`已寫入 ${charCount} 個字 → ${output}`)
  if (skipped.length) {
    console.warn(`略過 ${skipped.length} 個檔案（範例：${skipped.slice(0, 3).map((s) => s.filename).join(', ')}）`)
  }

  for (const sample of ['愛', '變', '財', '一']) {
    if (sorted[sample] !== undefined) {
      console.log(`  ${sample}: ${sorted[sample]} 畫`)
    }
  }
}

main()
