import { GoogleGenAI } from '@google/genai';
import mime from 'mime';

const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);

export const handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse multipart form data
    const boundary = event.headers['content-type'].split('boundary=')[1];
    const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
    
    // Simple multipart parser for image and prompt
    const parts = body.toString().split(`--${boundary}`);
    let imageBuffer = null;
    let mimeType = null;
    let prompt = null;

    for (const part of parts) {
      if (part.includes('name="image"')) {
        const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
        if (contentTypeMatch) {
          mimeType = contentTypeMatch[1];
        }
        
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        if (dataStart > 3 && dataEnd > dataStart) {
          imageBuffer = Buffer.from(part.slice(dataStart, dataEnd), 'binary');
        }
      } else if (part.includes('name="prompt"')) {
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        if (dataStart > 3 && dataEnd > dataStart) {
          prompt = part.slice(dataStart, dataEnd).trim();
        }
      }
    }

    if (!imageBuffer || !prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image and prompt are required' }),
      };
    }

    const base64Image = imageBuffer.toString('base64');

    console.log(`Processing image manipulation with prompt: "${prompt}"`);

    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    };

    const model = 'gemini-2.5-flash-image-preview';
    
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    const results = [];
    let fileIndex = 0;
    let textResponse = '';

    for await (const chunk of response) {
      if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
        continue;
      }

      for (const part of chunk.candidates[0].content.parts) {
        if (part.inlineData) {
          const fileName = `manipulated_image_${Date.now()}_${fileIndex++}`;
          const inlineData = part.inlineData;
          const fileExtension = mime.getExtension(inlineData.mimeType || 'image/png');
          
          // For Netlify, we return the base64 data directly instead of saving files
          results.push({
            type: 'image',
            data: inlineData.data,
            mimeType: inlineData.mimeType,
            filename: `${fileName}.${fileExtension}`
          });
        } else if (part.text) {
          textResponse += part.text;
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results: results,
        textResponse: textResponse || 'Image manipulation completed successfully!',
        prompt: prompt
      }),
    };

  } catch (error) {
    console.error('Error processing image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process image', 
        details: error.message 
      }),
    };
  }
};
