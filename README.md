# Gemini Image Editor - Nano Banana 🍌

A modern web application for image manipulation and generation using Google's Gemini 2.5 Flash Image model (nicknamed "Nano Banana").

## Features

- **Image Manipulation**: Upload an image and describe how you want to modify it
- **Text-to-Image Generation**: Generate new images from text descriptions
- **Modern UI**: Beautiful, responsive interface with drag-and-drop support
- **Real-time Processing**: Stream results as they're generated
- **Download Results**: Save generated/manipulated images

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   ```bash
   copy .env.example .env
   ```
   Then edit `.env` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Get Your API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Copy it to your `.env` file

4. **Run the Application**
   ```bash
   npm start
   ```

5. **Open in Browser**
   Navigate to `http://localhost:3000`

## Usage

### Image Manipulation
1. Upload an image by clicking the upload area or dragging and dropping
2. Enter a prompt describing how you want to modify the image
3. Click "Manipulate Image" and wait for results

### Image Generation
1. Enter a detailed description of the image you want to create
2. Click "Generate Image" and wait for results

## Example Prompts

### For Image Manipulation:
- "Add a rainbow in the background"
- "Make it look like a vintage photo"
- "Add sunglasses to the person"
- "Change the background to a beach scene"
- "Make the image black and white with a red accent"

### For Image Generation:
- "A futuristic city at sunset with flying cars"
- "A cat wearing a space helmet floating in space"
- "A magical forest with glowing mushrooms and fairy lights"
- "A steampunk robot playing chess"
- "A cozy coffee shop on a rainy day"

## Technical Details

- **Backend**: Node.js with Express
- **AI Model**: Gemini 2.5 Flash Image Preview
- **File Upload**: Multer with 10MB limit
- **Supported Formats**: JPG, PNG, GIF
- **Port**: 3000 (configurable)

## API Endpoints

- `GET /` - Serve the main application
- `POST /api/manipulate-image` - Manipulate uploaded images
- `POST /api/generate-image` - Generate new images from text

## Requirements

- Node.js 16+ 
- Valid Gemini API key
- Internet connection for API calls

## Troubleshooting

1. **"API key not found"**: Make sure your `.env` file exists and contains a valid `GEMINI_API_KEY`
2. **"File too large"**: Images must be under 10MB
3. **"Invalid file type"**: Only JPG, PNG, and GIF files are supported
4. **Slow processing**: Image generation can take 10-30 seconds depending on complexity

## License

MIT License - feel free to use and modify as needed!
