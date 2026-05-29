import './App.css'
import { useEffect, useState } from 'react'

const TRIGRAMS = [
  { name: '乾', symbol: '☰' },
  { name: '兌', symbol: '☱' },
  { name: '離', symbol: '☲' },
  { name: '震', symbol: '☳' },
  { name: '巽', symbol: '☴' },
  { name: '坎', symbol: '☵' },
  { name: '艮', symbol: '☶' },
  { name: '坤', symbol: '☷' },
]

const BRANCHES = [
  { name: '子時', number: 1 },
  { name: '丑時', number: 2 },
  { name: '寅時', number: 3 },
  { name: '卯時', number: 4 },
  { name: '辰時', number: 5 },
  { name: '巳時', number: 6 },
  { name: '午時', number: 7 },
  { name: '未時', number: 8 },
  { name: '申時', number: 9 },
  { name: '酉時', number: 10 },
  { name: '戌時', number: 11 },
  { name: '亥時', number: 12 },
]

function getTrigramByNumber(number) {
  const index = number % 8
  return TRIGRAMS[index]
}

function getLowerTrigramFromUpperAndBranch(upperTrigram, branchNumber) {
  const upperIndex = TRIGRAMS.findIndex(
    (item) => item.name === upperTrigram.name
  )

  const steps = branchNumber % 8
  const lowerIndex = (upperIndex + steps) % 8

  return TRIGRAMS[lowerIndex]
}

function getBranchFromTime(datetimeString) {
  if (!datetimeString) return null

  const date = new Date(datetimeString)
  const hour = date.getHours()

  if (hour >= 23 || hour < 1) return BRANCHES[0]
  if (hour < 3) return BRANCHES[1]
  if (hour < 5) return BRANCHES[2]
  if (hour < 7) return BRANCHES[3]
  if (hour < 9) return BRANCHES[4]
  if (hour < 11) return BRANCHES[5]
  if (hour < 13) return BRANCHES[6]
  if (hour < 15) return BRANCHES[7]
  if (hour < 17) return BRANCHES[8]
  if (hour < 19) return BRANCHES[9]
  if (hour < 21) return BRANCHES[10]

  return BRANCHES[11]
}

function App() {
  const [strokeMap, setStrokeMap] = useState({})
  const [hexagrams, setHexagrams] = useState([])
  const [interprets, setInterprets] = useState({})

  const [word, setWord] = useState('')
  const [question, setQuestion] = useState('')
  const [questionType, setQuestionType] = useState('general')
  const [divinationMode, setDivinationMode] = useState('character')

  const [result, setResult] = useState(null)
  const [aiInterpretation, setAiInterpretation] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [copied, setCopied] = useState(false)

  const [divinationTime, setDivinationTime] = useState('')

  useEffect(() => {
    fetch('/data/moe-strokes.json')
      .then((res) => res.json())
      .then((data) => setStrokeMap(data))
      .catch((err) => console.error('筆畫資料載入失敗', err))

    fetch('/data/hexagrams.json')
      .then((res) => res.json())
      .then((data) => setHexagrams(data))
      .catch((err) => console.error('卦象資料載入失敗', err))

    fetch('/data/interprets.json')
      .then((res) => res.json())
      .then((data) => setInterprets(data))
      .catch((err) => console.error('解讀資料載入失敗', err))
  }, [])

  function handleTarotDraw() {
    setAiInterpretation('')
    setCopied(false)

    const isUpright = Math.random() > 0.5

    if (!isUpright) {
      setResult({
        question,
        questionType,
        divinationMode,
        isUpright: false,
        message: '此次牌象未成，訊息尚未穩定。請靜心後重新抽牌。',
      })
      return
    }

    if (hexagrams.length === 0) return

    const randomIndex = Math.floor(Math.random() * hexagrams.length)
    const hexagram = hexagrams[randomIndex]

    setResult({
      question,
      questionType,
      divinationMode,
      isUpright: true,
      hexagram,
    })
  }

  function handleAnalyze() {
    setAiInterpretation('')
    setCopied(false)

    const char = word.trim()
    if (!char) return

    const strokes = strokeMap[char]

    if (!strokes || hexagrams.length === 0) {
      setResult({
        question,
        questionType,
        divinationMode,
        char,
        strokes: strokes || '尚未收錄',
        hexagram: {
          name: '資料載入中',
          meaning: '請稍後再試，或確認 JSON 資料是否已建立。',
        },
        time: divinationTime,
      })
      return
    }

    const upperTrigram = getTrigramByNumber(strokes)
    const branch = getBranchFromTime(divinationTime)

    const lowerTrigram = branch
      ? getLowerTrigramFromUpperAndBranch(upperTrigram, branch.number)
      : null

    const steps = branch ? branch.number % 8 : 0

    const hexagram =
      hexagrams.find(
        (item) =>
          item.upper === upperTrigram.name &&
          item.lower === lowerTrigram?.name
      ) || {
        number: '',
        name: `${upperTrigram.name}${lowerTrigram?.name || ''}`,
        meaning: '此卦尚未收錄在 hexagrams.json，請補上完整卦象資料。',
        advice: '請先確認上下卦對照是否已加入資料庫。',
      }

    setResult({
      question,
      questionType,
      divinationMode,
      char,
      strokes,
      upperTrigram,
      lowerTrigram,
      branch,
      steps,
      hexagram,
      time: divinationTime,
    })
  }

  async function generateAIInterpretation() {
    if (!result?.hexagram) return

    if (result.divinationMode === 'ichingTarot' && result.isUpright === false) {
      setAiInterpretation('此次牌象未成，請重新抽牌後再產生 AI 解讀。')
      return
    }

    setLoadingAI(true)
    setAiInterpretation('')

    try {
      const res = await fetch('/.netlify/functions/interpret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: result.question,
          questionType: result.questionType || questionType,
          hexagram: result.hexagram,
        }),
      })

      const data = await res.json()

      setAiInterpretation(data.interpretation || '目前無法產生 AI 解讀。')
    } catch (err) {
      console.error(err)
      setAiInterpretation('AI 解讀失敗，請稍後再試。')
    } finally {
      setLoadingAI(false)
    }
  }

  async function copyPrompt() {
    if (!result?.hexagram) return

    const prompt = `
你是一位熟悉易經、能以現代白話文解讀卦象的老師。

請根據以下資訊進行解讀：

【我的問題】
${result.question || '未填寫'}

【問題類型】
${result.questionType || questionType}

【占卜方式】
${result.divinationMode === 'ichingTarot' ? '易經塔羅卡' : '測字'}

【卦象】
第${result.hexagram.number}卦 ${result.hexagram.name}

【象意】
${result.hexagram.meaning}

【卦辭】
${result.hexagram.judgment}

【象曰】
${result.hexagram.image}

【建議】
${result.hexagram.advice}

${
  result.divinationMode === 'character'
    ? `【測字資訊】
測字：${result.char}
筆畫：${result.strokes}
上卦：${result.upperTrigram?.name} ${result.upperTrigram?.symbol}
下卦：${result.lowerTrigram?.name} ${result.lowerTrigram?.symbol}
時辰：${result.branch?.name}
推算位數：${result.steps}`
    : ''
}

請用繁體中文回答，並依照以下格式：

1. 這個卦象真正想告訴我什麼？
2. 我的問題核心盲點在哪裡？
3. 現在適合行動嗎？
4. 若行動，需要注意什麼？
5. 未來三個月的建議方向
6. 用一句話總結這個卦給我的提醒

請避免宿命論與恐嚇式解讀，請用理性、溫柔、具體的方式說明。
`

    await navigator.clipboard.writeText(prompt)

    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  const canShowResultContent =
    result && !(result.divinationMode === 'ichingTarot' && result.isUpright === false)

  return (
    <div className="app">
      <h1 className="title">易經占卜</h1>

      <div className="panel">
        <div className="label">請輸入問題</div>

        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例如：我要不要換工作？"
        />

        <div className="label">請選擇占卜方式</div>

        <select
          className="question-select"
          value={divinationMode}
          onChange={(e) => setDivinationMode(e.target.value)}
        >
          <option value="ichingTarot">易經塔羅卡</option>
          <option value="coins">銅錢六爻</option>
          <option value="character">測字</option>
        </select>

        <select
          className="question-select"
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
        >
          <option value="general">請選擇題型</option>
          <option value="career">事業</option>
          <option value="love">感情</option>
          <option value="money">財運</option>
          <option value="health">健康</option>
        </select>

        {divinationMode === 'character' && (
          <>
            <div className="label">請輸入一個字</div>

            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="例如：愛"
            />
          </>
        )}

        {divinationMode === 'ichingTarot' && (
          <button className="tarot-button" onClick={handleTarotDraw}>
            抽一張易經塔羅卡
          </button>
        )}

        {divinationMode !== 'ichingTarot' && (
          <input
            type="datetime-local"
            value={divinationTime}
            onChange={(e) => setDivinationTime(e.target.value)}
          />
        )}

        {divinationMode === 'character' && (
          <button onClick={handleAnalyze}>開始測字</button>
        )}
      </div>

      {result && (
        <div className="result-card">
          <h2 className="result-title">
            {result.divinationMode === 'ichingTarot' &&
            result.isUpright === false
              ? '請重新抽牌'
              : `${result.hexagram?.number ? `第${result.hexagram.number}卦 ` : ''}${
                  result.hexagram?.name || ''
                }`}
          </h2>

          {result.divinationMode === 'ichingTarot' &&
            result.isUpright === false && (
              <div className="result-row">{result.message}</div>
            )}

          <div className="result-row">問題：{result.question}</div>

          {canShowResultContent && (
            <>
              {result.divinationMode === 'character' && (
                <>
                  <div className="result-row">你測的字：{result.char}</div>
                  <div className="result-row">筆畫：{result.strokes}</div>
                </>
              )}

              <div className="result-row">
                象意：{result.hexagram?.meaning}
              </div>

              <div className="result-row">
                卦辭：{result.hexagram?.judgment}
              </div>

              <div className="result-row">
                象曰：{result.hexagram?.image}
              </div>

              <div className="result-row">
                建議：{result.hexagram?.advice}
              </div>

              <div className="result-row">
  白話解讀：
  {(() => {
    const type = result.questionType || questionType
    const savedText = interprets[result.hexagram?.number]?.[type]

    if (savedText && !savedText.includes('尚未建立')) {
      return savedText
    }

    return `這一卦的核心提醒是：「${result.hexagram?.meaning || '先觀察局勢，不宜急躁。'}」

如果用在你的問題上，可以先把它理解為：目前不要只看表面結果，而是要回到局勢本身，判斷現在適合推進、等待、整理，還是重新調整方向。

具體建議是：${result.hexagram?.advice || '先穩住狀態，再判斷下一步。'}`
  })()}
</div>

              <div className="result-row">
                <button className="copy-btn" onClick={copyPrompt}>
                  {copied ? '✅ 已複製' : '📋 複製 AI 解卦 Prompt'}
                </button>
              </div>

              {false && (
                <>
                  <button
                    onClick={generateAIInterpretation}
                    disabled={loadingAI}
                  >
                    {loadingAI ? 'AI 解牌中...' : '產生 AI 解牌'}
                  </button>

                  {aiInterpretation && (
                    <div className="result-row">
                      AI 解牌：{aiInterpretation}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {result.divinationMode === 'character' && (
            <>
              <div className="result-row">
                上卦：{result.upperTrigram?.name} {result.upperTrigram?.symbol}
              </div>

              <div className="result-row">
                下卦：{result.lowerTrigram?.name} {result.lowerTrigram?.symbol}
              </div>

              <div className="result-row">時辰：{result.branch?.name}</div>

              <div className="result-row">
                推算位數：{result.branch?.number % 8}
              </div>
            </>
          )}

          {result.divinationMode !== 'ichingTarot' && (
            <div className="badge">
              占測時間：{result.time || '未選擇'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App