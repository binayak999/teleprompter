import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { connectDB } from './config/database';
import { Video } from './models/Video';
import { User } from './models/User';
import { getUserId, formatFileSize, formatDuration } from './utils/userUtils';

// Types are declared globally in ../types/express-fileupload.d.ts

// Function to clean script content and remove metadata
function cleanScriptContent(script: string): string {
  return script
    // Remove common metadata patterns
    .replace(/^(Here's your script:|Script begins:|Generated script:|Script:)/i, '')
    .replace(/^(Title:|Topic:|Duration:|Tone:)/i, '')
    .replace(/^(Word count:|Length:|Estimated time:)/i, '')
    .replace(/^(Introduction:|Opening:|Closing:|Conclusion:)/i, '')
    .replace(/^(Paragraph \d+:|Section \d+:|Part \d+:)/i, '')
    // Remove timestamps
    .replace(/\[\d{1,2}:\d{2}\]/g, '')
    .replace(/\(\d{1,2}:\d{2}\)/g, '')
    // Remove formatting markers
    .replace(/^\s*[-*]\s*/gm, '')
    .replace(/^\s*\d+\.\s*/gm, '')
    // Remove extra whitespace
    .replace(/^\s+|\s+$/g, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove any remaining metadata lines
    .replace(/^.*?(script|generated|created|written).*?$/gmi, '')
    .trim();
}

// Type definitions for API responses
interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface SieveResponse {
  id: string;
  status: string;
}

interface SieveJobResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  result?: {
    output_video: {
      url: string;
    };
  };
  error?: string;
}

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// File upload middleware with type assertion
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
}) as any);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Debug endpoint to check session
app.get('/api/debug-session', (req, res) => {
  res.json({
    session: req.session,
    cookies: req.cookies,
    headers: req.headers
  });
});

// Get or create user
app.get('/api/user', async (req, res) => {
  try {
    const userId = getUserId(req);
    
    // Find or create user
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId });
      await user.save();
    }

    // Set user ID in cookie for future requests
    res.cookie('userId', userId, { 
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.json({ 
      userId: user.userId,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get user's videos
app.get('/api/videos', async (req, res) => {
  try {
    const userId = getUserId(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const videos = await Video.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments({ userId });

    const formattedVideos = videos.map(video => ({
      id: video._id,
      filename: video.filename,
      originalName: video.originalName,
      url: video.url,
      size: video.size,
      sizeFormatted: formatFileSize(video.size),
      duration: video.duration,
      durationFormatted: formatDuration(video.duration || 0),
      mimetype: video.mimetype,
      sieveJobId: video.sieveJobId,
      correctedVideoUrl: video.correctedVideoUrl,
      sieveStatus: video.sieveStatus,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt
    }));

    res.json({
      videos: formattedVideos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to get videos' });
  }
});

// Delete video
app.delete('/api/videos/:videoId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { videoId } = req.params;

    const video = await Video.findOne({ _id: videoId, userId });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(video.filepath)) {
      fs.unlinkSync(video.filepath);
    }

    // Delete from database
    await Video.findByIdAndDelete(videoId);

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Send video to SIEVE for eye correction
app.post('/api/send-to-sieve/:videoId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { videoId } = req.params;

    // Find the video in database
    const video = await Video.findOne({ _id: videoId, userId });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check if video file exists
    if (!fs.existsSync(video.filepath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    if (!process.env.SIEVE_API_KEY) {
      return res.status(500).json({ error: 'Sieve API key not configured' });
    }

    // Read the video file
    const videoBuffer = fs.readFileSync(video.filepath);
    const videoBase64 = videoBuffer.toString('base64');

    // Send to SIEVE API with axios
    const sieveResponse = await axios.post('https://mango.sievedata.com/v2/push', {
      function: 'sieve/eye-contact-correction',
      inputs: {
        input_video: {
          url: `data:${video.mimetype};base64,${videoBase64}`
        },
        accuracy_boost: false,
        enable_look_away: false,
        look_away_offset_max: 5,
        look_away_interval_min: 3,
        look_away_interval_range: 8,
        split_screen_view: false,
        draw_visualization: false,
        eyesize_sensitivity: 3,
        gaze_pitch_threshold_low: 20,
        gaze_yaw_threshold_low: 20,
        head_pitch_threshold_low: 15,
        head_yaw_threshold_low: 25,
        gaze_pitch_threshold_high: 30,
        gaze_yaw_threshold_high: 30,
        head_pitch_threshold_high: 25,
        head_yaw_threshold_high: 30
      }
    }, {
      headers: {
        'X-API-Key': process.env.SIEVE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const jobId = sieveResponse.data.id;
    
    // Update video with SIEVE job information
    await Video.findByIdAndUpdate(videoId, {
      sieveJobId: jobId,
      sieveStatus: 'processing'
    });

    res.json({ jobId, status: 'processing' });
  } catch (error) {
    console.error('Send to SIEVE error:', error);
    res.status(500).json({ error: 'Failed to send video to SIEVE' });
  }
});

// DeepSeek AI integration for script generation (streaming)
app.post('/api/generate-script', async (req, res) => {
  try {
    const { topic, duration, tone } = req.body;
    
    if (!topic || !duration || !tone) {
      return res.status(400).json({ error: 'Missing required fields: topic, duration, tone' });
    }
    
    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: 'DeepSeek API key not configured' });
    }

    // Calculate approximate word count based on duration (average speaking rate: 150 words per minute)
    const targetWordCount = duration * 150;

    const systemPrompt = `You are a professional teleprompter script writer. Your ONLY job is to create clean, teleprompter-ready scripts.

    CRITICAL RULES:
    - NEVER include metadata, formatting instructions, or explanatory text
    - NEVER add titles, headers, or section markers
    - NEVER include phrases like "Here's your script:" or "Script begins:"
    - NEVER add timestamps, word counts, or technical notes
    - ONLY provide the pure script content that should be read aloud
    - Start directly with the first word of the script
    - End directly with the last word of the script
    - Use natural speech patterns and conversational flow
    - Include clear paragraph breaks for easy reading
    - Avoid complex sentences that are hard to read aloud
    - Use active voice and direct language
    - Include natural pauses and transitions
    - Target approximately ${targetWordCount} words for a ${duration}-minute presentation
    - Format with proper spacing for teleprompter display
    
    REMEMBER: Your response should be ONLY the script content, nothing else.`;

    const userPrompt = `Create a ${duration}-minute teleprompter script about "${topic}" with a ${tone} tone.
    
    Requirements:
    - Engaging and informative content
    - Well-paced for ${duration} minutes of speaking
    - Formatted for easy teleprompter reading
    - Appropriate for the ${tone} tone requested
    - Clear paragraph breaks and natural speech patterns
    
    IMPORTANT: Provide ONLY the script content. Do not include any introductory text, formatting notes, or metadata. Start directly with the first sentence of the script.`;

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial status
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Starting script generation...' })}\n\n`);

    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
      stream: true // Enable streaming
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      responseType: 'stream'
    });

    let fullScript = '';
    let buffer = '';

    response.data.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            // Clean up the final script to remove any metadata
            const cleanedScript = cleanScriptContent(fullScript);
            // Send completion signal
            res.write(`data: ${JSON.stringify({ type: 'complete', script: cleanedScript })}\n\n`);
            res.end();
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              const content = parsed.choices[0].delta.content;
              fullScript += content;
              buffer += content;
              
              // Send chunks of text (every few characters or on sentence breaks)
              if (buffer.length >= 20 || buffer.includes('.') || buffer.includes('\n')) {
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: buffer })}\n\n`);
                buffer = '';
              }
            }
          } catch (e) {
            // Ignore parsing errors for incomplete JSON
          }
        }
      }
    });

    response.data.on('error', (error: any) => {
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream error occurred' })}\n\n`);
      res.end();
    });

    response.data.on('end', () => {
      // Send any remaining buffer content
      if (buffer.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: buffer })}\n\n`);
      }
      
      console.log(`Script generated successfully for topic: "${topic}" (${duration} min, ${tone} tone)`);
    });

  } catch (error) {
    console.error('Script generation error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Invalid DeepSeek API key' })}\n\n`);
      } else if (error.response?.status === 429) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Rate limit exceeded. Please try again later.' })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', message: `DeepSeek API error: ${error.response?.data?.error?.message || error.message}` })}\n\n`);
      }
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to generate script' })}\n\n`);
    }
    res.end();
  }
});

// Sieve eye correction integration (legacy endpoint - use /api/send-to-sieve/:videoId instead)
app.post('/api/correct-eyes', async (req, res) => {
  try {
    if (!req.files || !req.files.video) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const videoFile = req.files.video as fileUpload.UploadedFile;
    
    if (!process.env.SIEVE_API_KEY) {
      return res.status(500).json({ error: 'Sieve API key not configured' });
    }

    // Read the video file
    const videoBuffer = fs.readFileSync(videoFile.tempFilePath!);
    const videoBase64 = videoBuffer.toString('base64');

    // Send to SIEVE API with axios
    const response = await axios.post('https://mango.sievedata.com/v2/push', {
      function: 'sieve/eye-contact-correction',
      inputs: {
        input_video: {
          url: `data:${videoFile.mimetype};base64,${videoBase64}`
        },
        accuracy_boost: false,
        enable_look_away: false,
        look_away_offset_max: 5,
        look_away_interval_min: 3,
        look_away_interval_range: 8,
        split_screen_view: false,
        draw_visualization: false,
        eyesize_sensitivity: 3,
        gaze_pitch_threshold_low: 20,
        gaze_yaw_threshold_low: 20,
        head_pitch_threshold_low: 15,
        head_yaw_threshold_low: 25,
        gaze_pitch_threshold_high: 30,
        gaze_yaw_threshold_high: 30,
        head_pitch_threshold_high: 25,
        head_yaw_threshold_high: 30
      }
    }, {
      headers: {
        'X-API-Key': process.env.SIEVE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data as SieveResponse;
    
    // Clean up temp file
    fs.unlinkSync(videoFile.tempFilePath!);
    
    res.json({ jobId: result.id, status: 'processing' });
  } catch (error) {
    console.error('Eye correction error:', error);
    res.status(500).json({ error: 'Failed to process eye correction' });
  }
});

// Check Sieve job status
app.get('/api/check-job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const response = await axios.get(`https://mango.sievedata.com/v2/jobs/${jobId}`, {
      headers: {
        'X-API-Key': process.env.SIEVE_API_KEY!,
      },
    });

    const result = response.data;
    
    // If job is completed, find the video and update it with the corrected video URL
    if (result.status === 'finished' && result.outputs) {
      const correctedVideoUrl = result.outputs.output_video?.url;
      if (correctedVideoUrl) {
        // Find video by job ID and update it
        await Video.findOneAndUpdate(
          { sieveJobId: jobId },
          { 
            correctedVideoUrl,
            sieveStatus: 'completed'
          }
        );
      }
    } else if (result.status === 'failed') {
      // Update video status to failed
      await Video.findOneAndUpdate(
        { sieveJobId: jobId },
        { sieveStatus: 'failed' }
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Job status check error:', error);
    res.status(500).json({ error: 'Failed to check job status' });
  }
});

// Save recorded video
app.post('/api/save-video', async (req, res) => {
  try {
    if (!req.files || !req.files.video) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const userId = getUserId(req);
    const videoFile = req.files.video as fileUpload.UploadedFile;
    const timestamp = Date.now();
    const filename = `recording_${timestamp}.mp4`;
    const filepath = path.join(uploadsDir, filename);

    // Move file to uploads directory
    await videoFile.mv(filepath);

    // Save video information to database
    const video = new Video({
      userId,
      filename,
      originalName: videoFile.name,
      filepath,
      url: `/uploads/${filename}`,
      size: videoFile.size,
      mimetype: videoFile.mimetype
    });

    await video.save();

    res.json({ 
      message: 'Video saved successfully',
      filename,
      url: `/uploads/${filename}`,
      videoId: video._id
    });
  } catch (error) {
    console.error('Video save error:', error);
    res.status(500).json({ error: 'Failed to save video' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Uploads directory: ${uploadsDir}`);
});