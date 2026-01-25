import { GoogleGenAI } from "@google/genai";
import { MODEL_TEXT, MODEL_IMAGE, getSystemPrompt, MODEL_VIDEO } from "../constants";
import { VideoScript, Fact, VideoStyle, VideoEngine, MasterVideoResponse, R2Config, Persona } from "../types";

// Helper to strip data prefix from base64 strings
const stripBase64 = (base64: string) => {
  return base64.split(',')[1] || base64;
};

// Helper to resolve API keys (User provided > Environment variable)
const getGeminiKey = (userKey?: string) => userKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
const getKieKey = (userKey?: string) => userKey || process.env.KIEAI_API_KEY;

export const researchTopic = async (topic: string, apiKey?: string): Promise<{ facts: Fact[], groundingSources: any[] }> => {
  const key = getGeminiKey(apiKey);
  if (!key) throw new Error("Gemini API Key is missing. Please add it in Settings.");

  const ai = new GoogleGenAI({ apiKey: key });
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

export const generateScript = async (topic: string, facts: string, apiKey?: string, persona?: Persona): Promise<VideoScript> => {
  const key = getGeminiKey(apiKey);
  if (!key) throw new Error("Gemini API Key is missing. Please add it in Settings.");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: MODEL_TEXT,
    contents: `Topic: ${topic}\nFacts: ${facts}\nGenerate a high-retention viral script.`,
    config: {
      systemInstruction: getSystemPrompt(persona),
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

export const generateImage = async (prompt: string, apiKey?: string): Promise<string> => {
  const key = getGeminiKey(apiKey);
  if (!key) throw new Error("Gemini API Key is missing. Please add it in Settings.");

  const ai = new GoogleGenAI({ apiKey: key });
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
export const getVideoFromTaskId = async (taskId: string, onProgress?: (msg: string) => void, apiKey?: string): Promise<string> => {
  const key = getKieKey(apiKey);
  if (!key) throw new Error("KIE AI API Key is missing. Please add it in Settings.");

  onProgress?.("Fetching video from KIE AI...");

  try {
    const recordInfoUrl = `https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`;
    const response = await fetch(recordInfoUrl, {
      headers: {
        "Authorization": `Bearer ${key}`
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
    } else if (data.data?.errorCode && data.data?.errorCode !== 0) {
      throw new Error(`Video generation failed: ${data.data?.errorMessage || "Unknown error"}`);
    } else {
      // If successFlag is 0 and no errorCode, it's still processing
      throw new Error("Video is still processing. Please wait and try again.");
    }
  } catch (err: any) {
    throw new Error(`Failed to get video from task ID: ${err.message}`);
  }
};

export const generateVideo = async (
  prompt: string,
  onProgress?: (msg: string) => void,
  context?: { sceneText?: string; topic?: string; timestamp?: string; style?: VideoStyle; engine?: VideoEngine },
  apiKey?: string,
  onTaskId?: (taskId: string) => void,
  openAIKey?: string,
  falKey?: string,
  r2Config?: R2Config
): Promise<{ url: string; taskId: string }> => {
  const engine = context?.engine || 'veo';

  if (engine === 'sora2') {
    return generateVideoSora(prompt, onProgress, openAIKey, onTaskId, falKey, r2Config);
  }

  // Fallback to Veo (original logic renamed to generateVideoVeo)
  return generateVideoVeo(prompt, onProgress, context, apiKey, onTaskId);
};

export const generateVideoVeo = async (
  prompt: string,
  onProgress?: (msg: string) => void,
  context?: { sceneText?: string; topic?: string; timestamp?: string; style?: VideoStyle },
  apiKey?: string,
  onTaskId?: (taskId: string) => void
): Promise<{ url: string; taskId: string }> => {
  const key = getKieKey(apiKey);
  if (!key) throw new Error("KIE AI API Key is missing. Please add it in Settings.");

  onProgress?.("Initiating scene generation with KIE AI...");

  // Style-specific enhancements
  const styleKeywords: Record<VideoStyle, string> = {
    cinematic: "Cinematic, hyper-realistic, 8k textures, anamorphic lens flares, dramatic lighting, high-end film production.",
    gritty: "Gritty, handheld camera, high contrast, film grain, raw historical footage look, muted colors, intense atmosphere.",
    meme: "Meme-style, vibrant colors, slightly exaggerated character expressions, fast-paced action, high-energy visuals.",
    watercolor: "Artistic watercolor painting style, soft edges, flowing textures, historical illustration feel, elegant and evocative.",
    anime: "High-quality anime style, detailed backgrounds, expressive characters, dynamic action lines, cinematic cel-shaded look."
  };

  const selectedStyle = context?.style || 'cinematic';
  const cinematicEnhancement = styleKeywords[selectedStyle];

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
  enhancedPrompt += ` ${cinematicEnhancement} Period-accurate details, dynamic camera movement, high motion, educational and informative visual storytelling. Characters and actions must clearly convey the historical narrative. Maintain consistent character appearance and environment across scenes.`;

  try {
    // Step 1: Submit video generation request
    const generateResponse = await fetch("https://api.kie.ai/api/v1/veo/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
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

    const taskId = generateData.taskId || generateData.task_id || generateData.id ||
      generateData.data?.taskId || generateData.data?.id ||
      generateData.requestId || generateData.request_id ||
      generateData.jobId || generateData.job_id ||
      generateData.task || generateData.job ||
      (generateData.result && (generateData.result.taskId || generateData.result.id));

    if (immediateVideoUrl) {
      onProgress?.("Video generated successfully!");
      return { url: immediateVideoUrl, taskId: taskId || "immediate" };
    }

    // Otherwise, we need to poll for async generation
    const finalTaskId = taskId;

    if (!finalTaskId) {
      console.error("KIE AI API Response Structure:", generateData);
      throw new Error(
        `No task ID returned from KIE AI API and no immediate video URL found. ` +
        `Response structure: ${JSON.stringify(generateData).substring(0, 200)}...`
      );
    }

    console.log("Task ID extracted:", finalTaskId);
    if (onTaskId) onTaskId(finalTaskId);

    onProgress?.("Video generation in progress...");
    console.log("Starting polling for taskId:", finalTaskId);

    // Step 2: Poll for completion
    let status = "PENDING";
    let videoUrl = "";
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    let attempts = 0;

    while (status !== "COMPLETED" && status !== "SUCCESS" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      attempts++;

      try {
        const recordInfoUrl = `https://api.kie.ai/api/v1/veo/record-info?taskId=${finalTaskId}`;

        const statusResponse = await fetch(recordInfoUrl, {
          headers: {
            "Authorization": `Bearer ${key}`
          }
        });

        if (!statusResponse.ok) {
          console.warn(`Record info endpoint returned ${statusResponse.status}. Response:`, await statusResponse.text().catch(() => ''));
          onProgress?.(`Waiting for video... (${attempts * 5}s)`);
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`Polling attempt ${attempts} - Record info response:`, JSON.stringify(statusData, null, 2));

        if (statusData.code !== 200) {
          const errorMsg = statusData.msg || statusData.errorMessage || "Unknown error";
          // Only throw if it's an actual KIE AI processing error (not just pending)
          if (statusData.data?.errorCode && statusData.data?.errorCode !== 0) {
            throw new Error(`Video generation failed: ${statusData.data.errorMessage || errorMsg}`);
          }
          onProgress?.(`Status: ${errorMsg}... (${attempts * 5}s)`);
          continue;
        }

        if (statusData.data?.successFlag === 1) {
          const resultUrls = statusData.data?.response?.resultUrls;
          if (resultUrls && Array.isArray(resultUrls) && resultUrls.length > 0) {
            videoUrl = resultUrls[0];
            console.log("Video URL found:", videoUrl);
            status = "COMPLETED";
            break;
          } else {
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
        } else if (statusData.data?.errorCode && statusData.data?.errorCode !== 0) {
          const errorMsg = statusData.data?.errorMessage || statusData.msg || "Video generation failed";
          throw new Error(`Video generation failed: ${errorMsg}`);
        } else {
          // successFlag is 0 or undefined, and no errorCode, so we continue polling
          const progressMsg = statusData.data?.response ? "Processing..." : "Waiting for video...";
          onProgress?.(`${progressMsg} (${attempts * 5}s)`);
        }
      } catch (pollError: any) {
        console.error("Critical error in polling loop:", pollError.message);
        throw pollError;
      }
    }

    if (status !== "COMPLETED" && status !== "SUCCESS") {
      throw new Error("Video generation timed out or failed to complete. Please try again.");
    }

    return { url: videoUrl, taskId: finalTaskId };
  } catch (err: any) {
    if (err.message === "API_KEY_EXPIRED") {
      throw new Error("API_KEY_EXPIRED");
    }
    throw err;
  }
};

/**
 * Generate video using OpenAI Sora 2
 */
export const generateVideoSora = async (
  prompt: string,
  onProgress?: (msg: string) => void,
  apiKey?: string,
  onTaskId?: (taskId: string) => void,
  falKey?: string,
  r2Config?: R2Config
): Promise<{ url: string; taskId: string }> => {
  if (!apiKey) throw new Error("OpenAI API Key is missing. Please add it in Settings.");

  onProgress?.("Initiating Sora 2 generation...");

  try {
    const formData = new FormData();
    formData.append("model", "sora-2");
    formData.append("prompt", prompt);

    const response = await fetch("https://api.openai.com/v1/videos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const taskId = data.id;

    if (!taskId) throw new Error("No task ID returned from Sora API.");
    if (onTaskId) onTaskId(taskId);

    onProgress?.("Sora 2 generation in progress...");

    // Polling
    let status = "pending";
    let videoUrl = "";
    const maxAttempts = 120;
    let attempts = 0;

    while (status !== "completed" && status !== "succeeded" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

      const pollRes = await fetch(`https://api.openai.com/v1/videos/${taskId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();
      status = pollData.status?.toLowerCase() || "pending";

      if (status === "completed" || status === "succeeded") {
        const contentUrl = `https://api.openai.com/v1/videos/${taskId}/content`;
        let soraBlob: Blob | undefined;

        try {
          onProgress?.("Finalizing Sora video content...");
          console.log("Fetching Sora content from:", contentUrl);

          let blobRes;
          try {
            blobRes = await fetch(contentUrl, {
              headers: { "Authorization": `Bearer ${apiKey}` }
            });
          } catch (fetchErr: any) {
            console.error("OpenAI Content Fetch Failed:", fetchErr);
            throw new Error(`OpenAI CORS/Network Error: ${fetchErr.message}. Are you in a supported region?`);
          }

          if (!blobRes.ok) throw new Error(`Fetch failed (${blobRes.status}): ${blobRes.statusText}`);

          soraBlob = await blobRes.blob();
          console.log("Successfully fetched Sora blob:", soraBlob.size, "bytes");
          const fileName = `sora_${taskId}.mp4`;

          if (r2Config && r2Config.accountId && r2Config.publicUrl) {
            onProgress?.("Storing video in Cloudflare R2...");
            try {
              const { uploadToR2 } = await import('./r2Service');
              videoUrl = await uploadToR2(soraBlob, fileName, r2Config);
            } catch (r2Err: any) {
              console.error("R2 Upload Error:", r2Err);
              onProgress?.(`⚠ R2 Upload failed: ${r2Err.message}.`);
            }
          }

          if (!videoUrl && soraBlob) {
            videoUrl = URL.createObjectURL(soraBlob);
            onProgress?.("⚠ Local Preview only - Stitching will fail without working R2 storage.");
          }
        } catch (resolveErr: any) {
          console.error("Storage/Finalize Error:", resolveErr);

          // Fallback Strategy
          if (soraBlob) {
            videoUrl = URL.createObjectURL(soraBlob);
            onProgress?.(`⚠ Storage Error: ${resolveErr.message}. Using local preview.`);
          } else {
            // If we couldn't even get the blob, try the pollData URL
            videoUrl = pollData.video?.url || pollData.url || contentUrl;
            onProgress?.(`⚠ Finalize failed: ${resolveErr.message}. Using direct link.`);
          }
          console.warn("Sora fallback URL applied:", videoUrl);
        }

        break;
      }

      if (status === "failed") {
        throw new Error(`Sora generation failed: ${pollData.error?.message || "Unknown error"}`);
      }

      onProgress?.(`Sora 2 processing... (${attempts * 5}s)`);
    }

    if (!videoUrl) throw new Error("Sora generation timed out or failed to return a URL.");
    return { url: videoUrl, taskId };
  } catch (err: any) {
    throw new Error(`Sora Error: ${err.message}`);
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
  const requestId = result.request_id || result.requestId || result.id;

  if (!requestId) {
    throw new Error(`No request_id returned from fal.ai. Response: ${JSON.stringify(result)}`);
  }

  onProgress?.("Video merge in progress...");

  let status = "IN_PROGRESS";
  let finalUrl = "";
  const maxAttempts = 300;
  let attempts = 0;

  while (status !== "COMPLETED" && status !== "SUCCESS" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;

    try {
      const pollRes = await fetch(`https://queue.fal.run/fal-ai/ffmpeg-api/requests/${requestId}`, {
        headers: { "Authorization": `Key ${falKey}` }
      });

      if (!pollRes.ok) {
        if (pollRes.status === 422) {
          const failMsg = await pollRes.text();
          console.error("Fal.ai 422 Error details:", failMsg);
          throw new Error(`Fal.ai reported the request as unprocessable (422). Possible cause: inaccessible input URLs. Details: ${failMsg}`);
        }
        if (attempts >= maxAttempts) throw new Error("Video merge timed out. Please try again.");
        continue;
      }

      const pollData = await pollRes.json();
      status = pollData.status || pollData.state || "IN_PROGRESS";

      finalUrl = pollData.video?.url ||
        pollData.response?.video?.url ||
        pollData.response?.video_url ||
        pollData.response?.url ||
        pollData.response?.output_url ||
        pollData.response?.merged_video_url ||
        pollData.video_url ||
        pollData.url ||
        pollData.output_url;

      if (finalUrl) {
        onProgress?.("✓ Video merge completed!");
        status = "COMPLETED";
        break;
      }

      if (status === "FAILED" || status === "ERROR") {
        const errorMsg = pollData.error || pollData.message || pollData.response?.error || "Unknown error";
        throw new Error(`Video merge failed: ${errorMsg}`);
      }

      onProgress?.(`Merging videos... (${attempts * 2}s)`);
    } catch (pollError: any) {
      if (attempts >= maxAttempts) throw new Error("Video merge timed out. Please try again.");
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

/**
 * Mix audio and video using fal.ai FFmpeg API
 */
export const mixAudioVideoFal = async (videoUrl: string, audioUrl: string, falKey: string, onProgress?: (msg: string) => void): Promise<string> => {
  if (!videoUrl || !audioUrl) throw new Error("Video and audio URLs are required for mixing.");
  if (!falKey) throw new Error("FAL_API_KEY is required for mixing. Please enter it in Settings.");

  onProgress?.("Submitting audio-video mix request to fal.ai...");

  const response = await fetch("https://queue.fal.run/fal-ai/ffmpeg-api/merge-audio-video", {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      video_url: videoUrl,
      audio_url: audioUrl
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fal.ai API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const requestId = result.request_id || result.requestId || result.id;

  if (!requestId) {
    throw new Error(`No request_id returned from fal.ai.`);
  }

  onProgress?.(`Audio-video mixing in progress (Request ${requestId})...`);

  let status = "IN_PROGRESS";
  let finalUrl = "";
  const maxAttempts = 300; // Increase timeout to 10 minutes
  let attempts = 0;

  while (status !== "COMPLETED" && status !== "SUCCESS" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    attempts++;

    try {
      const pollRes = await fetch(`https://queue.fal.run/fal-ai/ffmpeg-api/requests/${requestId}`, {
        headers: { "Authorization": `Key ${falKey}` }
      });

      if (!pollRes.ok) {
        console.warn(`Mix polling returned ${pollRes.status}`);
        continue;
      }

      const pollData = await pollRes.json();
      status = pollData.status || pollData.state || "IN_PROGRESS";

      const currentUrl = pollData.video?.url ||
        pollData.response?.video?.url ||
        pollData.response?.video_url ||
        pollData.url ||
        pollData.response?.url ||
        pollData.merged_video_url ||
        pollData.response?.merged_video_url;

      if (currentUrl) {
        onProgress?.("✓ Audio-video mix completed!");
        finalUrl = currentUrl;
        status = "COMPLETED";
        break;
      }

      if (status === "FAILED" || status === "ERROR") {
        throw new Error(`Audio-video mix failed: ${pollData.error || pollData.message || "Unknown error"}`);
      }

      onProgress?.(`Mixing audio & video... (${attempts * 2}s)`);
    } catch (pollError: any) {
      console.error("Poll error in mix:", pollError);
      if (attempts >= maxAttempts) throw new Error("Audio-video mix timed out.");
    }
  }

  if (!finalUrl) throw new Error(`Audio-video mix finished with status ${status} but no URL was found.`);
  return finalUrl;
};



const isValidVideoUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') return false;
  if (url.startsWith('blob:')) return true; // Allow local blobs during preview phases
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

export const generateMasterVideo = async (
  script: VideoScript,
  falKey: string,
  onProgress?: (msg: string) => void,
  kieKey?: string,
  style?: VideoStyle,
  onSceneUpdate?: (sceneId: string, assetUrl: string, taskId: string) => void,
  onSceneTaskId?: (sceneId: string, taskId: string) => void,
  cartesiaKey?: string,
  voiceId?: string,
  onAudioUpdate?: (sceneId: string, audioUrl: string) => void,
  openAIKey?: string,
  r2Config?: R2Config
): Promise<MasterVideoResponse> => {
  const videoUrls: string[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    onProgress?.(`Processing Scene ${i + 1} of ${script.scenes.length}...`);

    try {
      let sceneVideoUrl = "";
      if (scene.assetUrl && scene.assetType === 'video') {
        sceneVideoUrl = scene.assetUrl;
        onProgress?.(`Using existing video for Scene ${i + 1}...`);
      } else if (scene.kieTaskId) {
        onProgress?.(`Polling for already-initiated Scene ${i + 1} video...`);
        // Use generateVideo again which handles polling correctly if prompt is same
        const result = await generateVideo(
          scene.visualPrompt,
          (msg) => {
            onProgress?.(`Scene ${i + 1}: ${msg}`);
          },
          {
            sceneText: scene.text,
            topic: script.topic,
            timestamp: scene.timestamp,
            style: style,
            engine: scene.engine || script.engine || 'veo'
          },
          kieKey,
          (taskId) => {
            if (onSceneTaskId) onSceneTaskId(scene.id, taskId);
          },
          openAIKey,
          falKey,
          r2Config
        );
        sceneVideoUrl = result.url;
        if (onSceneUpdate) onSceneUpdate(scene.id, result.url, result.taskId);
      } else {
        onProgress?.(`Rendering Scene ${i + 1}: ${scene.text.substring(0, 30)}...`);
        const result = await generateVideo(
          scene.visualPrompt,
          (msg) => {
            onProgress?.(`Scene ${i + 1}: ${msg}`);
          },
          {
            sceneText: scene.text,
            topic: script.topic,
            timestamp: scene.timestamp,
            style: style,
            engine: scene.engine || script.engine || 'veo'
          },
          kieKey,
          (taskId) => {
            if (onSceneTaskId) onSceneTaskId(scene.id, taskId);
          },
          openAIKey,
          falKey,
          r2Config
        );
        sceneVideoUrl = result.url;
        if (onSceneUpdate) onSceneUpdate(scene.id, result.url, result.taskId);
      }

      if (!isValidVideoUrl(sceneVideoUrl)) {
        throw new Error(`Invalid video URL format for Scene ${i + 1}`);
      }

      let finalSceneUrl = sceneVideoUrl;

      // Handle narration if enabled for this scene (or globally as fallback)
      if (scene.useNarration || script.useNarration) {
        if (!cartesiaKey || !voiceId) {
          onProgress?.(`⚠ Narration skipped for Scene ${i + 1}: Missing Cartesia Key/Voice ID in Settings.`);
        } else {
          onProgress?.(`Generating narration for Scene ${i + 1}...`);
          try {
            const { generateNarration, uploadToFal } = await import('./voiceService');
            const audioBlob = await generateNarration(scene.text, voiceId, cartesiaKey);
            onProgress?.(`Uploading narration to Fal.ai storage...`);
            const audioUrl = await uploadToFal(audioBlob, falKey);

            if (onAudioUpdate) onAudioUpdate(scene.id, audioUrl);

            onProgress?.(`Mixing audio and video for Scene ${i + 1}...`);
            finalSceneUrl = await mixAudioVideoFal(sceneVideoUrl, audioUrl, falKey, (msg) => {
              onProgress?.(`Scene ${i + 1} Mix: ${msg}`);
            });
            onProgress?.(`✓ Narration integrated into Scene ${i + 1}.`);
          } catch (audioError: any) {
            console.error(`Narration failed for Scene ${i + 1}:`, audioError);
            onProgress?.(`⚠ Narration failed for Scene ${i + 1}: ${audioError.message}. Using original video.`);
          }
        }
      }

      videoUrls.push(finalSceneUrl);
      onProgress?.(`✓ Scene ${i + 1} ready: ${finalSceneUrl.substring(0, 50)}...`);
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      onProgress?.(`✗ Scene ${i + 1} failed: ${errorMsg}`);
      throw new Error(`Failed to generate video for Scene ${i + 1} (${scene.id}): ${errorMsg}`);
    }
  }

  if (videoUrls.length === 0) throw new Error("No video URLs were generated. Cannot proceed with stitching.");

  onProgress?.(`✓ All ${videoUrls.length} videos ready. Preparing to stitch...`);
  onProgress?.("Stitching final cut with FFmpeg...");

  const masterUrl = await stitchVideosFal(videoUrls, falKey, onProgress);

  if (!masterUrl || !isValidVideoUrl(masterUrl)) {
    throw new Error("Stitching completed but returned an invalid master video URL.");
  }

  onProgress?.("✓ Master video stitched successfully!");
  return { url: masterUrl };
};