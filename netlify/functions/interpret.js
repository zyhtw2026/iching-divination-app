export async function handler(event) {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({
          error: 'Only POST requests allowed',
        }),
      }
    }
  
    try {
      const { question, questionType, hexagram } = JSON.parse(event.body)
  
      if (!question || !hexagram) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: 'Missing question or hexagram',
          }),
        }
      }
  
      const prompt = `
  你是一位溫柔、理性、擅長易經解卦的老師。
  
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
  
  請使用繁體中文解讀。
  
  規則：
  1. 不要神神鬼鬼
  2. 不要恐嚇
  3. 不要講宿命論
  4. 語氣像成熟朋友給建議
  5. 200~400字
  
  請包含：
  
  【這卦在說什麼】
  【目前適不適合行動】
  【具體建議】
  `
  
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: '你是一位專業易經解卦老師。',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.8,
          }),
        }
      )
  
      const data = await response.json()
  
      console.log('OPENAI RESPONSE:')
      console.log(JSON.stringify(data, null, 2))
  
      if (!response.ok) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            interpretation:
              data?.error?.message ||
              'OpenAI API Error',
          }),
        }
      }
  
      const interpretation =
        data?.choices?.[0]?.message?.content ||
        '目前無法產生解讀。'
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          interpretation,
        }),
      }
    } catch (error) {
      console.error(error)
  
      return {
        statusCode: 500,
        body: JSON.stringify({
          interpretation: `AI解讀失敗：${error.message}`,
        }),
      }
    }
  }