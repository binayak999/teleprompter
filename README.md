# Teleprompter Application

A modern teleprompter application with AI-powered script generation and video recording capabilities.

## Features

- **AI Script Generation**: Generate scripts using DeepSeek AI with different tones and durations
- **Video Recording**: Record flipped videos with camera and audio
- **Teleprompter Display**: Auto-scrolling text display with adjustable speed
- **Server Storage**: Videos are automatically uploaded to the server and saved locally
- **Eye Correction**: Integration with Sieve AI for eye contact correction (optional)

## Project Structure

```
teleprompter/
├── client/          # React frontend application
├── server/          # Express.js backend server
├── shared/          # Shared types and utilities
└── README.md        # This file
```

## Prerequisites

- Node.js (v16 or higher)
- Yarn or npm
- Camera and microphone access

## Setup Instructions

### 1. Install Dependencies

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install

# Return to root
cd ..
```

### 2. Environment Configuration

Create a `.env` file in the server directory:

```bash
cd server
touch .env
```

Add the following environment variables (optional for basic functionality):

```env
# DeepSeek AI API Key (for script generation)
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# Sieve AI API Key (for eye correction)
SIEVE_API_KEY=your_sieve_api_key_here

# Server port (default: 3001)
PORT=3001
```

### 3. Start the Server

```bash
cd server

# Development mode (with auto-reload)
npm run dev

# Or production mode
npm run build
npm start
```

The server will start on `http://localhost:3001`

### 4. Start the Client

In a new terminal:

```bash
cd client

# Development mode
npm run dev
```

The client will start on `http://localhost:5173`

## Usage

1. **Camera Setup**: Allow camera and microphone access when prompted
2. **Script Generation**: 
   - Click the "Script" button
   - Enter a topic, select duration and tone
   - Click the generate button to create an AI-powered script
3. **Recording**:
   - Click the red record button to start recording
   - Use pause/resume to control recording
   - Click stop to finish recording
   - Videos are automatically uploaded to the server and downloaded locally

## API Endpoints

### Server Endpoints

- `POST /api/save-video` - Upload and save recorded videos
- `POST /api/generate-script` - Generate AI scripts
- `POST /api/correct-eyes` - Apply eye contact correction (requires Sieve API)
- `GET /api/check-job/:jobId` - Check job status for eye correction
- `GET /api/health` - Server health check

### File Storage

- Videos are saved in `server/uploads/` directory
- Files are accessible via `/uploads/filename.mp4`

## Development

### Client Development

The client is built with:
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Lucide React for icons

### Server Development

The server is built with:
- Express.js with TypeScript
- express-fileupload for file handling
- CORS enabled for cross-origin requests

### Key Components

- **Header**: App branding and speed controls
- **ScriptModal**: AI script generation interface
- **TeleprompterDisplay**: Scrolling text display
- **CameraView**: Camera feed and recording canvas
- **RecordingControls**: Recording buttons and controls

## Troubleshooting

### Common Issues

1. **Camera not working**: Ensure camera permissions are granted
2. **Server connection failed**: Check if server is running on port 3001
3. **Recording not working**: Check browser console for errors
4. **Script generation failed**: Verify DeepSeek API key is configured

### Debug Mode

The application includes comprehensive logging. Check the browser console for:
- Camera initialization status
- Recording process logs
- Server communication logs
- Error messages

## License

This project is open source and available under the MIT License.
