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
    
    // Simple multipart parser for parent images and prompt
    const bodyParts = body.toString().split(`--${boundary}`);
    let parent1Buffer = null;
    let parent1MimeType = null;
    let parent2Buffer = null;
    let parent2MimeType = null;
    let prompt = null;

    for (const part of bodyParts) {
      if (part.includes('name="parent1"')) {
        const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
        if (contentTypeMatch) {
          parent1MimeType = contentTypeMatch[1];
        }
        
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        if (dataStart > 3 && dataEnd > dataStart) {
          parent1Buffer = Buffer.from(part.slice(dataStart, dataEnd), 'binary');
        }
      } else if (part.includes('name="parent2"')) {
        const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
        if (contentTypeMatch) {
          parent2MimeType = contentTypeMatch[1];
        }
        
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        if (dataStart > 3 && dataEnd > dataStart) {
          parent2Buffer = Buffer.from(part.slice(dataStart, dataEnd), 'binary');
        }
      } else if (part.includes('name="prompt"')) {
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        if (dataStart > 3 && dataEnd > dataStart) {
          prompt = part.slice(dataStart, dataEnd).trim();
        }
      }
    }

    if (!parent1Buffer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one parent image is required' }),
      };
    }

    const parent1Base64 = parent1Buffer.toString('base64');

    console.log(`Generating child image with ${parent2Buffer ? 'two parents' : 'one parent/couple'}`);

    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    };

    const model = 'gemini-2.5-flash-image-preview';
    
    const promptParts = [
      {
        text: `Generate an image of what a 7-year-old child would look like based on the facial features and characteristics of the parent(s) in the provided image(s). The child should have a natural blend of features from both parents, with age-appropriate characteristics of a happy, healthy 7-year-old. ${prompt ? `Additional details: ${prompt}` : ''}`,
      },
      {
        inlineData: {
          mimeType: parent1MimeType,
          data: parent1Base64,
        },
      },
    ];

    // Add second parent if provided
    if (parent2Buffer) {
      const parent2Base64 = parent2Buffer.toString('base64');
      
      promptParts.push({
        inlineData: {
          mimeType: parent2MimeType,
          data: parent2Base64,
        },
      });
    }

    const contents = [
      {
        role: 'user',
        parts: promptParts,
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
          const fileName = `child_image_${Date.now()}_${fileIndex++}`;
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
        textResponse: textResponse || 'Child generation completed successfully!',
        prompt: prompt || 'Generated 7-year-old child from parent photos'
      }),
    };

  } catch (error) {
    console.error('Error generating child image:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate child image', 
        details: error.message 
      }),
    };
  }
};
