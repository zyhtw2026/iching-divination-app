export async function handler(event) {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Only POST requests allowed' }),
      }
    }
  
    try {
      const { question, questionType, hexagram } = JSON.parse(event.body)
  
      if (!question || !hexagram) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing question or hexagram' }),
        }
      }
  
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          input: `
  你是一位溫柔、直白、懂易經的解卦老師。
  
  使用者問題：
  ${question}
  
  問題類型：
  ${questionType}
  
  卦象：
  第${hexagram.number}卦 ${hexagram.name}
  
  象意：
  ${hexagram.meaning}
  
  卦辭：
  ${hexagram.judgment}
  
  象曰：
  ${hexagram.image}
  
  建議：
  ${hexagram.advice}
  
  請用繁體中文，給出一段白話解讀。
  語氣要像給朋友建議，不要玄，不要恐嚇。
  請包含：
  1. 這卦在回答什麼
  2. 現在適不適合行動
  3. 具體建議
          `,
        }),
      })
  
      const data = await response.json()
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          interpretation: data.output_text || '目前無法產生解讀。',
        }),
      }
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'AI 解讀失敗' }),
      }
    }
  }