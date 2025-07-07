import { Request, Response } from 'express';
import { Video } from '../models/Video';
import { getUserId, formatFileSize, formatDuration } from '../utils/userUtils';
import fs from 'fs';
import path from 'path';

export class VideoController {
  /**
   * Get user's videos with pagination
   */
  static async getUserVideos(req: Request, res: Response): Promise<void> {
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
        scriptId: video.scriptId,
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
  }

  /**
   * Delete a video
   */
  static async deleteVideo(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserId(req);
      const { videoId } = req.params;

      const video = await Video.findOne({ _id: videoId, userId });
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
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
  }

  /**
   * Save recorded video
   */
  static async saveVideo(req: Request, res: Response): Promise<void> {
    try {
      if (!req.files || !req.files.video) {
        res.status(400).json({ error: 'No video file provided' });
        return;
      }

      const userId = getUserId(req);
      const videoFile = req.files.video as any;
      const { scriptId } = req.body;
      
      console.log('Video save request - User ID:', userId);
      console.log('Video save request - Script ID:', scriptId);
      console.log('Video save request - Body:', req.body);
      
      const timestamp = Date.now();
      const filename = `recording_${timestamp}.mp4`;
      const uploadsDir = path.join(__dirname, '../../uploads');
      const filepath = path.join(uploadsDir, filename);

      // Move file to uploads directory
      await videoFile.mv(filepath);

      // Save video information to database
      const videoData = {
        userId,
        filename,
        originalName: videoFile.name,
        filepath,
        url: `/uploads/${filename}`,
        size: videoFile.size,
        mimetype: videoFile.mimetype,
        scriptId: scriptId || null
      };
      
      console.log('Saving video with data:', videoData);
      
      const video = new Video(videoData);
      await video.save();
      
      console.log('Video saved successfully with ID:', video._id);
      console.log('Video script ID:', video.scriptId);

      res.json({ 
        message: 'Video saved successfully',
        filename,
        url: `/uploads/${filename}`,
        videoId: video._id,
        scriptId: video.scriptId
      });
    } catch (error) {
      console.error('Video save error:', error);
      res.status(500).json({ error: 'Failed to save video' });
    }
  }
} 