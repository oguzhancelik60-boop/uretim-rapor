import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }
        
        const prompt = `Analyze this image of a wood/timber table (калькулятор кругляка).

Extract the following information and return ONLY a valid JSON object (no markdown, no explanation):

{
    "tedarikci": "supplier name (поставщик)",
    "date": "YYYY-MM-DD format",
    "plaka": "vehicle plate number",
    "tomruklar": [
        {
            "boy": length in cm (e.g., 135, 260, 390),
            "caplar": [
                {"cap": diameter in cm, "adet": quantity, "hacim_birim": volume per piece, "hacim_toplam": total volume}
            ],
            "boy_toplam_adet": total pieces for this length,
            "boy_toplam_hacim": total volume for this length
        }
    ],
    "toplam_adet": total pieces,
    "toplam_hacim": total volume in m³
}

Rules:
- Only include rows where "Кол-во" (quantity) > 0
- "Диаметр" is diameter in cm
- "Длина" is length in cm  
- "Обьем общий" is total volume
- If you can't read something clearly, make your best guess
- Date format must be YYYY-MM-DD
- All numbers should be actual numbers, not strings
- Return ONLY the JSON, nothing else`;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [
                {
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
                }
            ]
        });
        
        const text = response.content[0].text;
        
        // JSON'u parse et
        let data;
        try {
            // Markdown code block varsa temizle
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
            console.error('JSON parse error:', parseError);
            console.error('Raw text:', text);
            return res.status(200).json({ 
                success: false, 
                error: 'AI response was not valid JSON',
                raw: text 
            });
        }
        
        // Veri doğrulama
        if (!data.tedarikci && !data.tomruklar) {
            return res.status(200).json({ 
                success: false, 
                error: 'Could not extract table data from image' 
            });
        }
        
        return res.status(200).json({ 
            success: true, 
            data 
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
