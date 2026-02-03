export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // CORS başlıkları
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: 'image required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Bu bir tomruk/kütük hesaplama tablosu fotoğrafı (калькулятор кругляка).

Aşağıdaki bilgileri çıkar ve SADECE geçerli bir JSON objesi döndür (markdown yok, açıklama yok):

{
    "tedarikci": "tedarikçi/поставщик adı",
    "date": "YYYY-MM-DD formatında tarih",
    "plaka": "araç plakası",
    "tomruklar": [
        {
            "boy": uzunluk cm olarak (örn: 135, 260, 390),
            "caplar": [
                {"cap": çap cm, "adet": adet, "hacim_birim": birim hacim, "hacim_toplam": toplam hacim}
            ],
            "boy_toplam_adet": bu uzunluk için toplam adet,
            "boy_toplam_hacim": bu uzunluk için toplam hacim
        }
    ],
    "toplam_adet": toplam adet,
    "toplam_hacim": toplam hacim m³
}

Kurallar:
- Sadece "Кол-во" (adet) > 0 olan satırları dahil et
- "Диаметр" çap demek (cm)
- "Длина" uzunluk demek (cm)
- "Обьем общий" toplam hacim demek
- Net okuyamadığın yerlerde en iyi tahminini yap
- Tarih formatı YYYY-MM-DD olmalı
- Tüm sayılar string değil number olmalı
- SADECE JSON döndür, başka bir şey yazma`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }]
      }),
    });

    const result = await response.json();
    
    if (result.error) {
      return new Response(JSON.stringify({ success: false, error: result.error.message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = result.content[0].text;
    
    // JSON'u parse et
    let data;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.slice(7);
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.slice(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.slice(0, -3);
      }
      data = JSON.parse(cleanText.trim());
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'AI yanıtı geçerli JSON değil',
        raw: text 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!data.tedarikci && !data.tomruklar) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Fotoğraftan tablo verisi çıkarılamadı' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
