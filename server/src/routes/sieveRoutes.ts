import express from 'express';
import axios from 'axios';
import fs from 'fs';
import { Video } from '../models/Video';
import { getUserId } from '../utils/userUtils';

const router = express.Router();

// Send video to SIEVE for eye correction
router.post('/send-to-sieve/:videoId', async (req, res) => {
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

// Sieve eye correction integration (legacy endpoint - use /send-to-sieve/:videoId instead)
router.post('/correct-eyes', async (req, res) => {
  try {
    if (!req.files || !req.files.video) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const videoFile = req.files.video as any;
    
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

    const result = response.data;
    
    // Clean up temp file
    fs.unlinkSync(videoFile.tempFilePath!);
    
    res.json({ jobId: result.id, status: 'processing' });
  } catch (error) {
    console.error('Eye correction error:', error);
    res.status(500).json({ error: 'Failed to process eye correction' });
  }
});

// Check Sieve job status
router.get('/check-job/:jobId', async (req, res) => {
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

export default router; 