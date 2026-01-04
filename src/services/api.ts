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
 * Sends note data to the backend for AI-powered key detection and chord progression recommendations.
 * 
 * @param data - The analysis request containing notes with durations and order
 * @returns The AI analysis response with key detection and chord recommendations
 * @throws Error if the request fails or backend returns an error
 */
export async function analyzeKeyWithAI(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  const baseUrl = getBaseUrl();
  const endpoint = `${baseUrl}/analyze-key`;

  console.log('[TrueKey API] Sending analysis request to:', endpoint);
  console.log('[TrueKey API] Payload:', {
    notesCount: data.notes.length,
    totalDurationMs: data.totalDurationMs,
    uniqueNotesCount: data.uniqueNotesCount,
  });

  console.log({data})

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error('[TrueKey API] Error response:', response.status, errorText);
    throw new Error(`AI analysis failed: ${response.status} - ${errorText}`);
  }

  const result: AIAnalysisResponse = await response.json();
  console.log('[TrueKey API] Analysis complete:', result.key);

  return result;
}
