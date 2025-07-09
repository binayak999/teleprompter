import React, { useState, useEffect } from 'react';
import { Play, Trash2, Download, Clock, HardDrive, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import type { Video } from '../services/api';

interface VideoListProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoList({ isOpen, onClose }: VideoListProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingVideos, setProcessingVideos] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Polling interval for job status
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  const fetchVideos = async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.getVideos(page, 10);
      setVideos(response.videos);
      setPagination(response.pagination);
    } catch (err) {
      setError('Failed to load videos');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Start polling for videos in processing state
  useEffect(() => {
    if (!isOpen) return;

    const processingVideoIds = videos
      .filter(video => video.sieveStatus === 'processing' && video.sieveJobId)
      .map(video => video.sieveJobId!);

    if (processingVideoIds.length === 0) {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      return;
    }

    // Clear existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Start new polling interval
    const interval = setInterval(async () => {
      try {
        for (const jobId of processingVideoIds) {
          console.log('Polling job status for:', jobId);
          const jobStatus = await api.checkSieveJob(jobId);
          console.log('Job status response:', jobStatus);
          
          if (jobStatus.status === 'finished') {
            console.log('Job finished successfully');
            setNotification({ type: 'success', message: 'Eye correction completed! The corrected video is ready for download.' });
            // Refresh the video list to get updated status
            await fetchVideos(pagination.page);
            break; // Exit loop since we're refreshing the list
          } else if (jobStatus.status === 'failed') {
            console.log('Job failed');
            setNotification({ type: 'error', message: 'Eye correction failed. Please try again.' });
            // Refresh the video list to get updated status
            await fetchVideos(pagination.page);
            break; // Exit loop since we're refreshing the list
          } else {
            console.log('Job still processing, status:', jobStatus.status);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
      }
    }, 10000); // Check every 10 seconds

    setPollingInterval(interval);

    // Cleanup on unmount or when modal closes
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isOpen, videos, pagination.page]);

  // Initial fetch when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen]);

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await api.deleteVideo(videoId);
      // Refresh the video list
      fetchVideos(pagination.page);
    } catch (err) {
      setError('Failed to delete video');
      console.error('Error deleting video:', err);
    }
  };

  const handleSendToSieve = async (videoId: string) => {
    if (!confirm('Send this video to SIEVE for eye contact correction? This may take a few minutes.')) {
      return;
    }

    try {
      setProcessingVideos(prev => new Set(prev).add(videoId));
      
      // Send to SIEVE
      const result = await api.sendToSieve(videoId);
      console.log('Video sent to SIEVE:', result);

      // Refresh the video list to show updated status
      await fetchVideos(pagination.page);
      
      // Remove from processing set
      setProcessingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    } catch (err) {
      setError('Failed to send video to SIEVE');
      console.error('Error sending to SIEVE:', err);
      setProcessingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };

  const handleDownload = (video: Video) => {
    const link = document.createElement('a');
    link.href = `https://interapi.upliftsolutions.com.np/api${video.url}`;
    link.download = video.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCorrected = (correctedVideoUrl: string, originalName: string) => {
    const link = document.createElement('a');
    link.href = correctedVideoUrl;
    link.download = `corrected-${originalName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefreshStatus = async () => {
    await fetchVideos(pagination.page);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">My Recordings</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshStatus}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Refresh status"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all"
            >
              <span className="text-gray-600 text-lg">×</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Notification */}
          {notification && (
            <div className={`mb-4 p-3 rounded-lg ${
              notification.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <span>{notification.message}</span>
                <button
                  onClick={() => setNotification(null)}
                  className="text-sm hover:opacity-70"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading videos...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => fetchVideos()}
                className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">No recordings yet</p>
              <p className="text-gray-400">Start recording to see your videos here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {video.originalName}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{video.durationFormatted}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-4 h-4" />
                          <span>{video.sizeFormatted}</span>
                        </div>
                        <span>{formatDate(video.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleDownload(video)}
                        className="p-2 text-gray-600 hover:text-pink-500 hover:bg-pink-50 rounded-lg transition-colors"
                        title="Download Original"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      {/* SIEVE Status and Actions */}
                      {video.sieveStatus === 'completed' && video.correctedVideoUrl ? (
                        <button
                          onClick={() => handleDownloadCorrected(video.correctedVideoUrl!, video.originalName)}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download AI-Corrected Video"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : video.sieveStatus === 'processing' || processingVideos.has(video.id) ? (
                        <div className="p-2 text-blue-600 bg-blue-50 rounded-lg">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : video.sieveStatus === 'failed' ? (
                        <button
                          onClick={() => handleSendToSieve(video.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Retry AI Eye Correction"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendToSieve(video.id)}
                          disabled={processingVideos.has(video.id)}
                          className="p-2 text-gray-600 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Apply AI Eye Correction"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(video.id)}
                        className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => fetchVideos(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded transition-colors"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => fetchVideos(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 rounded transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 