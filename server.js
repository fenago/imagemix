import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import { writeFile, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Gemini AI with explicit API key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
  process.exit(1);
}

const ai = new GoogleGenAI(apiKey);

function saveBinaryFile(fileName, content) {
  return new Promise((resolve, reject) => {
    writeFile(fileName, content, (err) => {
      if (err) {
        console.error(`Error writing file ${fileName}:`, err);
        reject(err);
        return;
      }
      console.log(`File ${fileName} saved to file system.`);
      resolve(fileName);
    });
  });
}

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// API endpoint for image manipulation
app.post('/api/manipulate-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    if (!req.body.prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    const { prompt } = req.body;
    const imageBuffer = req.file.buffer;
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;

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
          const buffer = Buffer.from(inlineData.data || '', 'base64');
          
          const fullFileName = `public/generated/${fileName}.${fileExtension}`;
          await saveBinaryFile(fullFileName, buffer);
          
          results.push({
            type: 'image',
            url: `/generated/${fileName}.${fileExtension}`,
            filename: `${fileName}.${fileExtension}`
          });
        } else if (part.text) {
          textResponse += part.text;
        }
      }
    }

    res.json({
      success: true,
      results: results,
      textResponse: textResponse || 'Image manipulation completed successfully!',
      prompt: prompt
    });

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      error: 'Failed to process image', 
      details: error.message 
    });
  }
});

// API endpoint for couple-to-child generation
app.post('/api/generate-child', upload.fields([
  { name: 'parent1', maxCount: 1 },
  { name: 'parent2', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.parent1) {
      return res.status(400).json({ error: 'At least one parent image is required' });
    }

    const { prompt } = req.body;
    const parent1Buffer = req.files.parent1[0].buffer;
    const parent1Base64 = parent1Buffer.toString('base64');
    const parent1MimeType = req.files.parent1[0].mimetype;

    console.log(`Generating child image with ${req.files.parent2 ? 'two parents' : 'one parent/couple'}`);

    const config = {
      responseModalities: ['IMAGE', 'TEXT'],
    };

    const model = 'gemini-2.5-flash-image-preview';
    
    const parts = [
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
    if (req.files.parent2) {
      const parent2Buffer = req.files.parent2[0].buffer;
      const parent2Base64 = parent2Buffer.toString('base64');
      const parent2MimeType = req.files.parent2[0].mimetype;
      
      parts.push({
        inlineData: {
          mimeType: parent2MimeType,
          data: parent2Base64,
        },
      });
    }

    const contents = [
      {
        role: 'user',
        parts: parts,
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
          const buffer = Buffer.from(inlineData.data || '', 'base64');
          
          const fullFileName = `public/generated/${fileName}.${fileExtension}`;
          await saveBinaryFile(fullFileName, buffer);
          
          results.push({
            type: 'image',
            url: `/generated/${fileName}.${fileExtension}`,
            filename: `${fileName}.${fileExtension}`
          });
        } else if (part.text) {
          textResponse += part.text;
        }
      }
    }

    res.json({
      success: true,
      results: results,
      textResponse: textResponse || 'Child generation completed successfully!',
      prompt: prompt || 'Generated 7-year-old child from parent photos'
    });

  } catch (error) {
    console.error('Error generating child image:', error);
    res.status(500).json({ 
      error: 'Failed to generate child image', 
      details: error.message 
    });
  }
});

// API endpoint for text-to-image generation
app.post('/api/generate-image', async (req, res) => {
  try {
    if (!req.body.prompt) {
      return res.status(400).json({ error: 'No prompt provided' });
    }

    const { prompt } = req.body;
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
          const buffer = Buffer.from(inlineData.data || '', 'base64');
          
          const fullFileName = `public/generated/${fileName}.${fileExtension}`;
          await saveBinaryFile(fullFileName, buffer);
          
          results.push({
            type: 'image',
            url: `/generated/${fileName}.${fileExtension}`,
            filename: `${fileName}.${fileExtension}`
          });
        } else if (part.text) {
          textResponse += part.text;
        }
      }
    }

    res.json({
      success: true,
      results: results,
      textResponse: textResponse || 'Image generation completed successfully!',
      prompt: prompt
    });

  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ 
      error: 'Failed to generate image', 
      details: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`🚀 Gemini Image Editor server running at http://localhost:${port}`);
  console.log(`📸 Ready to manipulate images with Nano Banana (Gemini 2.5 Flash Image)!`);
  console.log(`🔑 Make sure to set your GEMINI_API_KEY environment variable`);
});
