import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

// Generate a unique user ID for this session
const generateUserId = (): string => {
  // Try to get existing user ID from localStorage
  let userId = localStorage.getItem('teleprompter_user_id');
  
  // If no user ID exists, generate a new one
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('teleprompter_user_id', userId);
  }
  
  return userId;
};

const API_BASE_URL = 'http://192.168.1.67:3001/api'; // Updated to use server IP

export interface ScriptGenerationRequest {
  topic: string;
  duration: number;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'informative';
}

export interface ScriptGenerationResponse {
  script: string;
}

export interface EyeCorrectionResponse {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface JobStatusResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  result?: {
    output_video: {
      url: string;
    };
  };
  error?: string;
}

export interface SaveVideoResponse {
  message: string;
  filename: string;
  url: string;
  videoId: string;
}

export interface GenerateScriptResponse {
  script: string;
  scriptId: string;
  title: string;
  message: string;
}

export interface Script {
  id: string;
  scriptId: string;
  title: string;
  content?: string;
  topic: string;
  duration: number;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'informative';
  createdAt: string;
  updatedAt: string;
}

export interface ScriptListResponse {
  scripts: Script[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Video {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  sizeFormatted: string;
  duration: number;
  durationFormatted: string;
  mimetype: string;
  scriptId?: string;
  scriptTitle?: string;
  scriptTopic?: string;
  sieveJobId?: string;
  correctedVideoUrl?: string;
  sieveStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface VideoListResponse {
  videos: Video[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Create axios instance with default configuration
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds timeout
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': generateUserId(),
    },
  });

  // Request interceptor to add user ID to all requests
  instance.interceptors.request.use(
    (config) => {
      config.headers['X-User-ID'] = generateUserId();
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      console.error('API Error:', error.response?.data || error.message);
      return Promise.reject(error);
    }
  );

  return instance;
};

const apiInstance = createApiInstance();

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = apiInstance;
  }

  async generateScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse> {
    const response = await this.api.post('/script/generate', request);
    return response.data;
  }

  async correctEyes(videoFile: File): Promise<EyeCorrectionResponse> {
    const formData = new FormData();
    formData.append('video', videoFile);

    const response = await this.api.post('/sieve/correct-eyes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async checkJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await this.api.get(`/sieve/check-job/${jobId}`);
    return response.data;
  }

  async saveVideo(videoBlob: Blob, filename: string): Promise<SaveVideoResponse> {
    const formData = new FormData();
    formData.append('video', videoBlob, filename);

    const response = await this.api.post('/videos/save', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.api.get('/debug/health');
    return response.data;
  }

  async getVideos(page = 1, limit = 10): Promise<VideoListResponse> {
    const response = await this.api.get('/videos', {
      params: { page, limit },
    });
    return response.data;
  }

  async deleteVideo(videoId: string): Promise<{ message: string }> {
    const response = await this.api.delete(`/videos/${videoId}`);
    return response.data;
  }

  // Script management methods
  async getUserScripts(page = 1, limit = 10): Promise<ScriptListResponse> {
    const response = await this.api.get('/script', {
      params: { page, limit },
    });
    return response.data;
  }

  async getScriptById(scriptId: string): Promise<Script> {
    const response = await this.api.get(`/script/${scriptId}`);
    return response.data;
  }

  async deleteScript(scriptId: string): Promise<{ message: string }> {
    const response = await this.api.delete(`/script/${scriptId}`);
    return response.data;
  }
}

export const apiService = new ApiService();

export const api = {
  // Save recorded video to server
  async saveVideo(videoBlob: Blob, filename: string, scriptInfo?: { scriptId?: string; scriptTitle?: string; scriptTopic?: string }): Promise<SaveVideoResponse> {
    const formData = new FormData();
    formData.append('video', videoBlob, filename);
    
    if (scriptInfo) {
      if (scriptInfo.scriptId) formData.append('scriptId', scriptInfo.scriptId);
      if (scriptInfo.scriptTitle) formData.append('scriptTitle', scriptInfo.scriptTitle);
      if (scriptInfo.scriptTopic) formData.append('scriptTopic', scriptInfo.scriptTopic);
    }

    const response = await apiInstance.post('/videos/save', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Generate script using AI (streaming)
  async generateScriptStream(
    topic: string, 
    duration: number, 
    tone: string,
    onChunk: (content: string) => void,
    onStatus: (message: string) => void,
    onComplete: (fullScript: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/script/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': generateUserId(),
        },
        body: JSON.stringify({ topic, duration, tone }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate script: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let fullScript = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete(fullScript);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullScript += parsed.content;
                onChunk(parsed.content);
              }
              if (parsed.status) {
                onStatus(parsed.status);
              }
            } catch {
              // Ignore parsing errors for incomplete JSON
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  },

  // Generate script using AI (non-streaming)
  async generateScript(topic: string, duration: number, tone: string): Promise<GenerateScriptResponse> {
    const response = await apiInstance.post('/script/generate', { topic, duration, tone });
    return response.data;
  },

  // Get user's videos
  async getVideos(page = 1, limit = 10): Promise<VideoListResponse> {
    const response = await apiInstance.get('/videos', {
      params: { page, limit },
    });
    return response.data;
  },

  // Delete a video
  async deleteVideo(videoId: string): Promise<{ message: string }> {
    const response = await apiInstance.delete(`/videos/${videoId}`);
    return response.data;
  },

  // Send video to Sieve for eye correction
  async sendToSieve(videoId: string): Promise<{ jobId: string; status: string }> {
    const response = await apiInstance.post(`/sieve/send-to-sieve/${videoId}`);
    return response.data;
  },

  // Check Sieve job status
  async checkSieveJob(jobId: string): Promise<{
    id: string;
    status: 'processing' | 'finished' | 'failed';
    outputs?: {
      output_video: {
        url: string;
      };
    };
    error?: string;
  }> {
    const response = await apiInstance.get(`/sieve/check-job/${jobId}`);
    return response.data;
  },

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await apiInstance.get('/debug/health');
    return response.data;
  },

  // Debug session (for troubleshooting)
  async debugSession(): Promise<{
    session: Record<string, unknown>;
    cookies: Record<string, unknown>;
    headers: Record<string, unknown>;
  }> {
    const response = await apiInstance.get('/debug/session');
    return response.data;
  },

  // Script management methods
  async getUserScripts(page = 1, limit = 10): Promise<ScriptListResponse> {
    const response = await apiInstance.get('/script', {
      params: { page, limit },
    });
    return response.data;
  },

  async getScriptById(scriptId: string): Promise<Script> {
    const response = await apiInstance.get(`/script/${scriptId}`);
    return response.data;
  },

  async deleteScript(scriptId: string): Promise<{ message: string }> {
    const response = await apiInstance.delete(`/script/${scriptId}`);
    return response.data;
  },
};