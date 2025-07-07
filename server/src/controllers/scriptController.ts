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
   * Generate script using DeepSeek AI with streaming and save to database
   */
  static async generateScript(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserId(req);
      const { topic, duration, tone } = req.body;

      if (!topic || !duration || !tone) {
        res.status(400).json({ error: 'Missing required fields: topic, duration, tone' });
        return;
      }

      if (!process.env.DEEPSEEK_API_KEY) {
        res.status(500).json({ error: 'DeepSeek API key not configured' });
        return;
      }

      // Generate title
      const title = `${topic} - ${duration}min ${tone}`;

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
              const cleanedScript = ScriptController.cleanScriptContent(fullScript);
              
              // Save script to database
              ScriptController.saveScriptToDatabase(userId, title, cleanedScript, topic, duration, tone)
                .then(savedScript => {
                  // Send completion signal with script ID
                  res.write(`data: ${JSON.stringify({ type: 'complete', script: cleanedScript, scriptId: savedScript._id.toString(), title })}\n\n`);
                  res.end();
                })
                .catch(error => {
                  console.error('Failed to save script:', error);
                  res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to save script to database' })}\n\n`);
                  res.end();
                });
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
  }

  /**
   * Save script to database (helper method)
   */
  private static async saveScriptToDatabase(userId: string, title: string, content: string, topic: string, duration: number, tone: string): Promise<any> {
    try {
      const script = new Script({
        userId,
        title,
        content,
        topic,
        duration,
        tone
      });

      const savedScript = await script.save();
      console.log(`Script saved to database with ID: ${savedScript._id}`);
      return savedScript;
    } catch (error) {
      console.error('Failed to save script to database:', error);
      throw error;
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
        scriptId: script._id.toString(),
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

      const script = await Script.findOne({ _id: scriptId, userId });
      if (!script) {
        res.status(404).json({ error: 'Script not found' });
        return;
      }

      res.json({
        id: script._id,
        scriptId: script._id.toString(),
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

      const script = await Script.findOne({ _id: scriptId, userId });
      if (!script) {
        res.status(404).json({ error: 'Script not found' });
        return;
      }

      await Script.findByIdAndDelete(scriptId);
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