
import { GoogleGenAI } from "@google/genai";
import { MODEL_TEXT, MODEL_IMAGE, SYSTEM_PROMPT, MODEL_VIDEO } from "../constants";
import { VideoScript, Fact } from "../types";

// Helper to strip data prefix from base64 strings
const stripBase64 = (base64: string) => {
  return base64.split(',')[1] || base64;
};

export const researchTopic = async (topic: string): Promise<{ facts: Fact[], groundingSources: any[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: `Find 3 bizarre or humorous facts about: ${topic}. Be factual but focus on irony.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const factsText = response.text;
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  
  return {
    facts: [{ title: 'Research Findings', content: factsText || '' }],
    groundingSources: groundingChunks
  };
};

export const generateScript = async (topic: string, facts: string): Promise<VideoScript> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: `Topic: ${topic}\nFacts: ${facts}\nGenerate a high-retention viral script.`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  try {
    const data = JSON.parse(response.text || '{}');
    return data as VideoScript;
  } catch (e) {
    console.error("Failed to parse script JSON", e);
    throw new Error("Invalid script format received from AI.");
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_IMAGE,
    contents: {
      parts: [{ text: `${prompt}. Style: Cinematic, hyper-realistic, dynamic lighting, historical accuracy but stylized for TikTok.` }],
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

/**
 * Fetch video URL from KIE AI using task ID
 */
export const getVideoFromTaskId = async (taskId: string, onProgress?: (msg: string) => void): Promise<string> => {
  const apiKey = process.env.KIEAI_API_KEY;
  if (!apiKey) {
    throw new Error("KIEAI_API_KEY is required. Please set it in your .env.local file.");
  }

  onProgress?.("Fetching video from KIE AI...");

  try {
    const recordInfoUrl = `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`;
    const response = await fetch(recordInfoUrl, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.code !== 200) {
      throw new Error(`KIE AI API error: ${data.msg || data.errorMessage || "Unknown error"}`);
    }

    // Check if video is ready
    if (data.data?.successFlag === 1) {
      const resultUrls = data.data?.response?.resultUrls;
      if (resultUrls && Array.isArray(resultUrls) && resultUrls.length > 0) {
        return resultUrls[0];
      }
      
      // Try originUrls as fallback
      const originUrls = data.data?.response?.originUrls;
      if (originUrls && Array.isArray(originUrls) && originUrls.length > 0) {
        return originUrls[0];
      }
      
      throw new Error("Video is ready but no URL found in response");
    } else if (data.data?.successFlag === 0 || data.data?.errorCode) {
      throw new Error(`Video generation failed: ${data.data?.errorMessage || "Unknown error"}`);
    } else {
      throw new Error("Video is still processing. Please wait and try again.");
    }
  } catch (err: any) {
    throw new Error(`Failed to get video from task ID: ${err.message}`);
  }
};

export const generateVideo = async (
  prompt: string, 
  onProgress?: (msg: string) => void,
  context?: { sceneText?: string; topic?: string; timestamp?: string }
): Promise<{ url: string; taskId: string }> => {
  const apiKey = process.env.KIEAI_API_KEY;
  if (!apiKey) {
    throw new Error("KIEAI_API_KEY is required. Please set it in your .env.local file.");
  }

  onProgress?.("Initiating scene generation with KIE AI...");
  
  // Enhanced prompt for historical content with educational context
  let enhancedPrompt = prompt;
  
  // Add context to help align video with storyboard
  if (context?.sceneText) {
    enhancedPrompt += ` This scene illustrates: "${context.sceneText}".`;
  }
  
  if (context?.topic) {
    enhancedPrompt += ` Historical topic: ${context.topic}.`;
  }
  
  // Add video-specific enhancements
  enhancedPrompt += ` Cinematic historical recreation, period-accurate details, dynamic camera movement, high motion, educational and informative visual storytelling. Characters and actions must clearly convey the historical narrative.`;
  
  try {
    // Step 1: Submit video generation request
    const generateResponse = await fetch("https://api.kie.ai/api/v1/veo/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        model: "veo3_fast",
        aspectRatio: "9:16",
        enableFallback: false,
        enableTranslation: true,
        generationType: "TEXT_2_VIDEO"
      })
    });

    if (!generateResponse.ok) {
      let errorData: any = {};
      try {
        const errorText = await generateResponse.text();
        errorData = JSON.parse(errorText);
      } catch {
        // If JSON parsing fails, use empty object
      }
      
      console.error("KIE AI API Error Response:", {
        status: generateResponse.status,
        statusText: generateResponse.statusText,
        body: errorData
      });
      
      if (generateResponse.status === 401) {
        throw new Error("API_KEY_EXPIRED");
      }
      
      const errorMessage = errorData.message || errorData.error || errorData.detail || generateResponse.statusText;
      throw new Error(`KIE AI API error (${generateResponse.status}): ${errorMessage}`);
    }

    const responseText = await generateResponse.text();
    let generateData: any;
    try {
      generateData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse KIE AI API response as JSON:", responseText);
      throw new Error(`Invalid JSON response from KIE AI API: ${responseText.substring(0, 200)}`);
    }
    
    // Log the response for debugging
    console.log("KIE AI API Response:", JSON.stringify(generateData, null, 2));
    
    // Check if video is returned immediately (synchronous response)
    const immediateVideoUrl = generateData.videoUrl || generateData.video_url || generateData.url || 
                              generateData.downloadUrl || generateData.download_url ||
                              generateData.video || generateData.fileUrl || generateData.file_url ||
                              (generateData.data && (generateData.data.videoUrl || generateData.data.url || generateData.data.video)) ||
                              (generateData.result && (generateData.result.videoUrl || generateData.result.url || generateData.result.video));
    
    if (immediateVideoUrl) {
      onProgress?.("Video generated successfully!");
      return immediateVideoUrl;
    }
    
    // Otherwise, we need to poll for async generation
    // Try multiple possible field names for task ID
    // KIE AI typically returns taskId in the response
    const taskId = generateData.taskId || generateData.task_id || generateData.id || 
                   generateData.data?.taskId || generateData.data?.id ||
                   generateData.requestId || generateData.request_id ||
                   generateData.jobId || generateData.job_id ||
                   generateData.task || generateData.job ||
                   (generateData.result && (generateData.result.taskId || generateData.result.id));
    
    if (!taskId) {
      // Log the full response to help debug
      console.error("KIE AI API Response Structure:", generateData);
      throw new Error(
        `No task ID returned from KIE AI API and no immediate video URL found. ` +
        `Response structure: ${JSON.stringify(generateData).substring(0, 200)}...`
      );
    }
    
    console.log("Task ID extracted:", taskId);

    onProgress?.("Video generation in progress...");
    console.log("Starting polling for taskId:", taskId);

    // Step 2: Poll for completion
    let status = "PENDING";
    let videoUrl = "";
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    let attempts = 0;
    
    // Store the initial response data for potential re-checking
    let lastKnownData = generateData;

    while (status !== "COMPLETED" && status !== "SUCCESS" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      attempts++;

      try {
        // Use the correct KIE AI endpoint to get video details
        const recordInfoUrl = `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`;
        
        const statusResponse = await fetch(recordInfoUrl, {
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        });

        if (!statusResponse.ok) {
          console.warn(`Record info endpoint returned ${statusResponse.status}. Response:`, await statusResponse.text().catch(() => ''));
          // Continue polling if endpoint returns error (might still be processing)
          onProgress?.(`Waiting for video... (${attempts * 5}s)`);
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`Polling attempt ${attempts} - Record info response:`, JSON.stringify(statusData, null, 2));
        
        // Check if request was successful
        if (statusData.code !== 200) {
          const errorMsg = statusData.msg || statusData.errorMessage || "Unknown error";
          if (statusData.data?.errorMessage) {
            throw new Error(`Video generation failed: ${statusData.data.errorMessage}`);
          }
          // Continue polling if it's not a fatal error
          onProgress?.(`Status: ${errorMsg}... (${attempts * 5}s)`);
          continue;
        }

        // Check if video generation is complete
        // successFlag === 1 means the video is ready
        if (statusData.data?.successFlag === 1) {
          // Get video URL from resultUrls array
          const resultUrls = statusData.data?.response?.resultUrls;
          if (resultUrls && Array.isArray(resultUrls) && resultUrls.length > 0) {
            videoUrl = resultUrls[0]; // Use the first result URL
            console.log("Video URL found:", videoUrl);
            status = "COMPLETED";
            break;
          } else {
            // Try originUrls as fallback
            const originUrls = statusData.data?.response?.originUrls;
            if (originUrls && Array.isArray(originUrls) && originUrls.length > 0) {
              videoUrl = originUrls[0];
              console.log("Video URL found (originUrls):", videoUrl);
              status = "COMPLETED";
              break;
            } else {
              console.warn("successFlag is 1 but no resultUrls found:", statusData);
              onProgress?.(`Video ready but URL not found... (${attempts * 5}s)`);
            }
          }
        } else if (statusData.data?.successFlag === 0 || statusData.data?.errorCode) {
          // Video generation failed
          const errorMsg = statusData.data?.errorMessage || statusData.msg || "Video generation failed";
          throw new Error(`Video generation failed: ${errorMsg}`);
        } else {
          // Still processing
          const progressMsg = statusData.data?.response ? "Processing..." : "Waiting for video...";
          onProgress?.(`${progressMsg} (${attempts * 5}s)`);
        }
      } catch (pollError: any) {
        // Continue polling on error, but log it
        console.warn("Polling error:", pollError);
        if (attempts >= maxAttempts) {
          throw new Error("Video generation timed out. Please try again.");
        }
      }
    }

    if (status !== "COMPLETED" && status !== "SUCCESS") {
      throw new Error(`Video generation did not complete. Status: ${status}`);
    }

    if (!videoUrl) {
      throw new Error("Video generation completed but no video URL was returned.");
    }

    return { url: videoUrl, taskId };
  } catch (err: any) {
    if (err.message === "API_KEY_EXPIRED") {
      throw new Error("API_KEY_EXPIRED");
    }
    throw err;
  }
};

/**
 * Stitch multiple video URLs together using fal.ai FFmpeg API
 */
export const stitchVideosFal = async (videoUrls: string[], falKey: string, onProgress?: (msg: string) => void): Promise<string> => {
  if (videoUrls.length === 0) throw new Error("No videos to stitch.");
  if (videoUrls.length === 1) return videoUrls[0];
  if (!falKey) throw new Error("FAL_API_KEY is required for stitching. Please enter it in Settings.");

  onProgress?.("Submitting video merge request to fal.ai...");

  // Use the correct fal.ai merge-videos endpoint
  const response = await fetch("https://queue.fal.run/fal-ai/ffmpeg-api/merge-videos", {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      video_urls: videoUrls
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      // If JSON parsing fails, use the text
    }
    throw new Error(`Fal.ai API error (${response.status}): ${errorData.message || errorData.error || errorText || response.statusText}`);
  }

  const result = await response.json();
  console.log("Fal.ai merge response:", result);

  // Extract request_id from response
  const requestId = result.request_id || result.requestId || result.id;
  if (!requestId) {
    console.error("Fal.ai response structure:", result);
    throw new Error(`No request_id returned from fal.ai. Response: ${JSON.stringify(result)}`);
  }

  onProgress?.("Video merge in progress...");

  // Poll for completion
  let status = "IN_PROGRESS";
  let finalUrl = "";
  const maxAttempts = 300; // 10 minutes max (2 second intervals)
  let attempts = 0;

  while (status !== "COMPLETED" && status !== "SUCCESS" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
    attempts++;

    try {
      const pollRes = await fetch(`https://queue.fal.run/fal-ai/ffmpeg-api/requests/${requestId}`, {
        headers: { "Authorization": `Key ${falKey}` }
      });

      if (!pollRes.ok) {
        console.warn(`Polling request returned ${pollRes.status}`);
        if (attempts >= maxAttempts) {
          throw new Error("Video merge timed out. Please try again.");
        }
        continue;
      }

      const pollData = await pollRes.json();
      console.log(`Polling attempt ${attempts} - Status:`, pollData.status, "Full response:", JSON.stringify(pollData, null, 2));

      status = pollData.status || pollData.state || "IN_PROGRESS";

      // Extract video URL from response - fal.ai returns it at video.url
      // Check for video URL regardless of status (sometimes video is ready before status updates)
      finalUrl = pollData.video?.url ||
                pollData.response?.video?.url ||
                pollData.response?.video_url || 
                pollData.response?.url || 
                pollData.response?.output_url ||
                pollData.response?.merged_video_url ||
                pollData.video_url ||
                pollData.url ||
                pollData.output_url;
      
      // If we have a video URL, we're done (even if status hasn't updated yet)
      if (finalUrl) {
        console.log("Merged video URL found:", finalUrl);
        onProgress?.("✓ Video merge completed!");
        status = "COMPLETED"; // Set status to completed since we have the video
        break;
      }
      
      // Check status-based completion
      if (status === "COMPLETED" || status === "SUCCESS") {
        // Status says completed but no URL found - log for debugging
        console.warn("Status is COMPLETED but no video URL found. Full response:", JSON.stringify(pollData, null, 2));
      } else if (status === "FAILED" || status === "ERROR") {
        const errorMsg = pollData.error || pollData.message || pollData.response?.error || "Unknown error";
        throw new Error(`Video merge failed: ${errorMsg}`);
      }

      onProgress?.(`Merging videos... (${attempts * 2}s)`);
    } catch (pollError: any) {
      console.warn("Polling error:", pollError);
      if (attempts >= maxAttempts) {
        throw new Error("Video merge timed out. Please try again.");
      }
      // Continue polling on error
    }
  }

  if (status !== "COMPLETED" && status !== "SUCCESS") {
    throw new Error(`Video merge did not complete. Status: ${status}`);
  }

  if (!finalUrl) {
    throw new Error("Video merge completed but no video URL was returned.");
  }

  return finalUrl;
};

export interface MasterVideoResponse {
  url: string;
}

/**
 * Validate that a URL is a valid video URL format
 */
const isValidVideoUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Orchestrate per-scene rendering and final stitching
 */
export const generateMasterVideo = async (
  script: VideoScript, 
  falKey: string,
  onProgress?: (msg: string) => void
): Promise<MasterVideoResponse> => {
  const videoUrls: string[] = [];
  const failedScenes: { index: number; sceneId: string; error: string }[] = [];

  // Step 1: Generate or collect all video URLs
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    onProgress?.(`Processing Scene ${i + 1} of ${script.scenes.length}...`);
    
    try {
      let sceneVideoUrl = "";
      if (scene.assetUrl && scene.assetType === 'video') {
        sceneVideoUrl = scene.assetUrl;
        onProgress?.(`Using existing video for Scene ${i + 1}...`);
      } else if (scene.kieTaskId) {
        // If we have a taskId but no URL, fetch it from KIE AI
        onProgress?.(`Fetching Scene ${i + 1} video from KIE AI...`);
        sceneVideoUrl = await getVideoFromTaskId(scene.kieTaskId, (msg) => {
          onProgress?.(`Scene ${i + 1}: ${msg}`);
        });
      } else {
        onProgress?.(`Rendering Scene ${i + 1}: ${scene.text.substring(0, 30)}...`);
        // Pass context to help align video with storyboard
        const result = await generateVideo(
          scene.visualPrompt, 
          (msg) => {
            onProgress?.(`Scene ${i + 1}: ${msg}`);
          },
          {
            sceneText: scene.text,
            topic: script.topic,
            timestamp: scene.timestamp
          }
        );
        sceneVideoUrl = result.url;
        // Note: taskId is already stored in scene.kieTaskId from App.tsx
      }

      // Validate the URL before adding
      if (!isValidVideoUrl(sceneVideoUrl)) {
        throw new Error(`Invalid video URL format for Scene ${i + 1}`);
      }

      videoUrls.push(sceneVideoUrl);
      onProgress?.(`✓ Scene ${i + 1} video ready: ${sceneVideoUrl.substring(0, 50)}...`);
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      failedScenes.push({ 
        index: i + 1, 
        sceneId: scene.id, 
        error: errorMsg 
      });
      onProgress?.(`✗ Scene ${i + 1} failed: ${errorMsg}`);
      throw new Error(`Failed to generate video for Scene ${i + 1} (${scene.id}): ${errorMsg}`);
    }
  }

  // Step 2: Validate all videos are ready before stitching
  if (videoUrls.length === 0) {
    throw new Error("No video URLs were generated. Cannot proceed with stitching.");
  }

  if (videoUrls.length !== script.scenes.length) {
    const missingCount = script.scenes.length - videoUrls.length;
    throw new Error(
      `Only ${videoUrls.length} of ${script.scenes.length} videos were generated. ` +
      `${missingCount} scene(s) failed. Cannot proceed with stitching.`
    );
  }

  // Validate all URLs are valid
  const invalidUrls = videoUrls.filter((url, index) => !isValidVideoUrl(url));
  if (invalidUrls.length > 0) {
    throw new Error(
      `Found ${invalidUrls.length} invalid video URL(s). ` +
      `All videos must have valid URLs before stitching.`
    );
  }

  // Step 3: Log summary before stitching
  onProgress?.(`✓ All ${videoUrls.length} videos ready. Preparing to stitch...`);
  console.log('Video URLs ready for stitching:', videoUrls.map((url, i) => ({
    scene: i + 1,
    url: url.substring(0, 80) + '...'
  })));

  // Step 4: Stitch videos together
  onProgress?.("Stitching final cut with FFmpeg...");
  const masterUrl = await stitchVideosFal(videoUrls, falKey, onProgress);

  if (!masterUrl || !isValidVideoUrl(masterUrl)) {
    throw new Error("Stitching completed but returned an invalid master video URL.");
  }

  onProgress?.("✓ Master video stitched successfully!");
  return { url: masterUrl };
};
