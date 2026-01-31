import fs from 'fs';
import https from 'https';

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const prompt = process.argv[2] || 'Generate a cute pixel art café building, 64x64, game sprite';
const outputName = process.argv[3] || 'output.png';

// Use Nano Banana (gemini-2.5-flash-image)
const requestBody = JSON.stringify({
  contents: [{
    parts: [{ text: prompt }]
  }],
  generationConfig: {
    responseModalities: ['IMAGE', 'TEXT']
  }
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: '/v1beta/models/nano-banana-pro-preview:generateContent',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': API_KEY
  }
};

console.log('🍌 Nano Banana generating:', prompt.substring(0, 60) + '...');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.error) {
        console.error('❌ API Error:', response.error.message);
        return;
      }
      
      // Find image in Gemini response format
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          const imageData = Buffer.from(part.inlineData.data, 'base64');
          fs.writeFileSync(outputName, imageData);
          console.log('✅ Saved:', outputName, `(${imageData.length} bytes)`);
          return;
        }
        if (part.text) {
          console.log('Text response:', part.text.substring(0, 200));
        }
      }
      
      console.log('No image found. Response keys:', Object.keys(response));
      if (response.candidates) {
        console.log('Candidate parts:', response.candidates[0]?.content?.parts?.map(p => Object.keys(p)));
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw:', data.substring(0, 500));
    }
  });
});

req.on('error', e => console.error('Request error:', e.message));
req.write(requestBody);
req.end();
