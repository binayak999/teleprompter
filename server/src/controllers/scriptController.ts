import { Request, Response } from 'express';
import axios from 'axios';
import { Script } from '../models/Script';
import { getUserId } from '../utils/userUtils';
import { v4 as uuidv4 } from 'uuid';

export class ScriptController {
  /**
   * Clean script content and remove metadata
   */
  private static cleanScriptContent(script: string): string {
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

  /**
   * Generate and save a new script
   */
  static async generateScript(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserId(req);
      const { topic, duration, tone } = req.body;
      
      if (!topic || !duration || !tone) {
        res.status(400).json({ error: 'Missing required fields: topic, duration, tone' });
        return;
      }
      
      // Generate script content using AI (placeholder for now)
      const scriptContent = await ScriptController.generateAIScript(topic, duration, tone);
      
      // Generate unique script ID
      const scriptId = `script_${Date.now()}_${uuidv4().substr(0, 8)}`;
      
      // Create title from topic
      const title = `${topic} - ${duration}min ${tone}`;

      // Save script to database
      const script = new Script({
        userId,
        scriptId,
        title,
        content: scriptContent,
        topic,
        duration,
        tone
      });

      await script.save();

      res.json({
        script: scriptContent,
        scriptId,
        title,
        message: 'Script generated and saved successfully'
      });
    } catch (error) {
      console.error('Script generation error:', error);
      res.status(500).json({ error: 'Failed to generate script' });
    }
  }

  /**
   * Get user's script history
   */
  static async getUserScripts(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserId(req);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const scripts = await Script.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content'); // Don't include full content in list

      const total = await Script.countDocuments({ userId });

      const formattedScripts = scripts.map(script => ({
        id: script._id,
        scriptId: script.scriptId,
        title: script.title,
        topic: script.topic,
        duration: script.duration,
        tone: script.tone,
        createdAt: script.createdAt,
        updatedAt: script.updatedAt
      }));

      res.json({
        scripts: formattedScripts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get scripts error:', error);
      res.status(500).json({ error: 'Failed to get scripts' });
    }
  }

  /**
   * Get a specific script by ID
   */
  static async getScriptById(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserId(req);
      const { scriptId } = req.params;

      const script = await Script.findOne({ scriptId, userId });
      if (!script) {
        res.status(404).json({ error: 'Script not found' });
        return;
      }

      res.json({
        id: script._id,
        scriptId: script.scriptId,
        title: script.title,
        content: script.content,
        topic: script.topic,
        duration: script.duration,
        tone: script.tone,
        createdAt: script.createdAt,
        updatedAt: script.updatedAt
      });
    } catch (error) {
      console.error('Get script error:', error);
      res.status(500).json({ error: 'Failed to get script' });
    }
  }

  /**
   * Delete a script
   */
  static async deleteScript(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserId(req);
      const { scriptId } = req.params;

      const script = await Script.findOne({ scriptId, userId });
      if (!script) {
        res.status(404).json({ error: 'Script not found' });
        return;
      }

      await Script.findByIdAndDelete(script._id);
      res.json({ message: 'Script deleted successfully' });
    } catch (error) {
      console.error('Delete script error:', error);
      res.status(500).json({ error: 'Failed to delete script' });
    }
  }

  /**
   * Generate AI script content (placeholder - replace with actual AI integration)
   */
  private static async generateAIScript(topic: string, duration: number, tone: string): Promise<string> {
    // This is a placeholder - replace with your actual AI script generation logic
    const wordsPerMinute = 150; // Average speaking rate
    const totalWords = Math.floor(duration * wordsPerMinute);
    
    const tonePrompts = {
      professional: 'in a professional and authoritative manner',
      casual: 'in a casual and friendly manner',
      enthusiastic: 'with enthusiasm and energy',
      informative: 'in an informative and educational manner'
    };

    const prompt = `Generate a ${duration}-minute script about "${topic}" ${tonePrompts[tone as keyof typeof tonePrompts]}. The script should be approximately ${totalWords} words and be suitable for a teleprompter.`;

    // For now, return a placeholder script
    // In production, this would call your AI service
    return `[AI Generated Script - ${duration} minutes]

Topic: ${topic}
Tone: ${tone}

This is a placeholder script that would be generated by your AI service. The actual implementation would call your AI API to generate content based on the topic, duration, and tone parameters.

The script would be approximately ${totalWords} words and formatted for easy reading on a teleprompter with natural pauses and clear structure.

[End of placeholder script]`;
  }
} 