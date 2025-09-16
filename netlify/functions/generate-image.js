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
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No prompt provided' }),
      };
    }

    console.log(`Generating image with prompt: "${prompt}"`);

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
          const fileName = `generated_image_${Date.now()}_${fileIndex++}`;
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
        textResponse: textResponse || 'Image generation completed successfully!',
        prompt: prompt
      }),
    };

  } catch (error) {
    console.error('Error generating image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate image', 
        details: error.message 
      }),
    };
  }
};
