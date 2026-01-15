export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { imageUrl, prompt } = await req.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Default prompt covers both Kurutma and Papel machines
    const defaultPrompt = `Bu bir fabrika makine ekranının fotoğrafı. 
Eğer "VENEER SHEET COUNTER" görüyorsan o değeri oku.
Eğer "Ürün Sayısı" görüyorsan o değeri oku.
Sadece sayıyı döndür. Örnek: 623
Eğer bulamazsan "null" yaz.
Sadece sayı veya null yaz, başka bir şey yazma.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: imageUrl } },
            { type: 'text', text: prompt || defaultPrompt }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const text = data.content[0].text.trim();
    let result = null;
    
    if (text !== 'null' && text !== '') {
      const num = parseInt(text.replace(/\D/g, ''));
      if (!isNaN(num)) result = num;
    }

    return new Response(JSON.stringify({ result }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
