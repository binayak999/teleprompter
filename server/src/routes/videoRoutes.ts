import express from 'express';
import { Video } from '../models/Video';
import { getUserId, formatFileSize, formatDuration } from '../utils/userUtils';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Get user's videos
router.get('/', async (req, res) => {
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
router.delete('/:videoId', async (req, res) => {
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

// Save recorded video
router.post('/save', async (req, res) => {
  try {
    if (!req.files || !req.files.video) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const userId = getUserId(req);
    const videoFile = req.files.video as any;
    const timestamp = Date.now();
    const filename = `recording_${timestamp}.mp4`;
    const uploadsDir = path.join(__dirname, '../../uploads');
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

export default router; 