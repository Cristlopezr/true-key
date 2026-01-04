/**
 * API service for backend communication
 */

import type { AIAnalysisRequest, AIAnalysisResponse } from '@/types/aiAnalysis';

/**
 * Gets the backend base URL from environment variables
 */
function getBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
  if (!baseUrl) {
    throw new Error('VITE_BACKEND_BASE_URL is not defined in environment variables');
  }
  // Remove trailing slash if present
  return baseUrl.replace(/\/$/, '');
}

/**
 * Custom error class for rate limit errors
 */
export class RateLimitError extends Error {
  retryAfterMs: number;
  
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Sends note data to the backend for AI-powered key detection and chord progression recommendations.
 * 
 * @param data - The analysis request containing notes with durations and order
 * @returns The AI analysis response with key detection and chord recommendations
 * @throws Error if the request fails or backend returns an error
 * @throws RateLimitError if rate limit is exceeded (429)
 */
export async function analyzeKeyWithAI(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/analyze-key`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    // Try to parse as JSON first for structured error responses
    let errorData: { error?: string; message?: string; retryAfterMs?: number } | null = null;
    
    try {
      errorData = await response.json();
    } catch {
      // Not JSON, will fall back to text
    }

    // Handle rate limit error (429)
    if (response.status === 429 && errorData) {
      console.warn('[TrueKey API] Rate limit exceeded:', errorData.message);
      throw new RateLimitError(
        errorData.message || 'Rate limit exceeded. Please try again later.',
        errorData.retryAfterMs || 24 * 60 * 60 * 1000 // Default to 24 hours
      );
    }

    // Handle other errors
    const errorMessage = errorData?.message || errorData?.error || 'Unknown error';
    console.error('[TrueKey API] Error response:', response.status, errorMessage);
    throw new Error(`AI analysis failed: ${errorMessage}`);
  }

  const result: AIAnalysisResponse = await response.json();
  return result;
}
