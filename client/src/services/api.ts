const API_BASE_URL = 'http://localhost:3001/api';

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

class ApiService {
  private async fetchWithErrorHandling(url: string, options?: RequestInit) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async generateScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse> {
    return this.fetchWithErrorHandling('/script/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async correctEyes(videoFile: File): Promise<EyeCorrectionResponse> {
    const formData = new FormData();
    formData.append('video', videoFile);

    const response = await fetch(`${API_BASE_URL}/sieve/correct-eyes`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async checkJobStatus(jobId: string): Promise<JobStatusResponse> {
    return this.fetchWithErrorHandling(`/sieve/check-job/${jobId}`);
  }

  async saveVideo(videoBlob: Blob, filename: string): Promise<SaveVideoResponse> {
    const formData = new FormData();
    formData.append('video', videoBlob, filename);

    const response = await fetch(`${API_BASE_URL}/videos/save`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to save video: ${response.statusText}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/debug/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getVideos(page = 1, limit = 10): Promise<VideoListResponse> {
    const response = await fetch(`${API_BASE_URL}/videos?page=${page}&limit=${limit}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to get videos: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteVideo(videoId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to delete video: ${response.statusText}`);
    }
    return response.json();
  }
}

export const apiService = new ApiService();

export const api = {
  // Save recorded video to server
  async saveVideo(videoBlob: Blob, filename: string): Promise<SaveVideoResponse> {
    const formData = new FormData();
    formData.append('video', videoBlob, filename);

    const response = await fetch(`${API_BASE_URL}/videos/save`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to save video: ${response.statusText}`);
    }

    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/script/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'status':
                  onStatus(data.message);
                  break;
                case 'chunk':
                  onChunk(data.content);
                  break;
                case 'complete':
                  onComplete(data.script);
                  return;
                case 'error':
                  onError(data.message);
                  return;
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  // Generate script using AI (legacy non-streaming)
  async generateScript(topic: string, duration: number, tone: string): Promise<GenerateScriptResponse> {
    const response = await fetch(`${API_BASE_URL}/script/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, duration, tone }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate script: ${response.statusText}`);
    }

    return response.json();
  },

  // Get user's videos
  async getVideos(page = 1, limit = 10): Promise<VideoListResponse> {
    const response = await fetch(`${API_BASE_URL}/videos?page=${page}&limit=${limit}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to get videos: ${response.statusText}`);
    }
    return response.json();
  },

  // Delete video
  async deleteVideo(videoId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to delete video: ${response.statusText}`);
    }
    return response.json();
  },

  // Send video to SIEVE for eye correction
  async sendToSieve(videoId: string): Promise<{ jobId: string; status: string }> {
    const response = await fetch(`${API_BASE_URL}/sieve/send-to-sieve/${videoId}`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to send video to SIEVE: ${response.statusText}`);
    }
    return response.json();
  },

  // Check SIEVE job status
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
    const response = await fetch(`${API_BASE_URL}/sieve/check-job/${jobId}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.statusText}`);
    }
    return response.json();
  },

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE_URL}/debug/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  },

  // Debug session
  async debugSession(): Promise<{
    session: Record<string, unknown>;
    cookies: Record<string, unknown>;
    headers: Record<string, unknown>;
  }> {
    const response = await fetch(`${API_BASE_URL}/debug/session`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Debug session failed: ${response.statusText}`);
    }
    return response.json();
  },
};