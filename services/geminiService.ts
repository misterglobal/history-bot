
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

export const generateVideo = async (prompt: string, onProgress?: (msg: string) => void): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  onProgress?.("Initiating scene generation...");
  
  let operation;
  try {
    operation = await ai.models.generateVideos({
      model: MODEL_VIDEO,
      prompt: `${prompt}. Cinematic style, high motion, dynamic historical recreation.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });
  } catch (err: any) {
    if (err.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_EXPIRED");
    }
    throw err;
  }

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    const pollAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    operation = await pollAi.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed.");

  return `${downloadLink}&key=${process.env.API_KEY}`;
};

/**
 * Stitch multiple video URLs together using fal.ai FFmpeg bridge
 */
export const stitchVideosFal = async (videoUrls: string[], falKey: string): Promise<string> => {
  if (videoUrls.length === 0) throw new Error("No videos to stitch.");
  if (videoUrls.length === 1) return videoUrls[0];
  if (!falKey) throw new Error("FAL_API_KEY is required for stitching. Please enter it in Settings.");

  const inputs = videoUrls.map(url => `-i "${url}"`).join(" ");
  const filter = videoUrls.map((_, i) => `[${i}:v]`).join("") + `concat=n=${videoUrls.length}:v=1:a=0[outv]`;
  const command = `ffmpeg ${inputs} -filter_complex "${filter}" -map "[outv]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p output.mp4`;

  const response = await fetch("https://queue.fal.run/fal-ai/ffmpeg-bridge", {
    method: "POST",
    headers: {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ command })
  });

  const result = await response.json();
  if (result.error) throw new Error(`FFmpeg Bridge Error: ${result.error}`);

  const requestId = result.request_id;
  let status = "IN_PROGRESS";
  let finalUrl = "";

  while (status !== "COMPLETED") {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const pollRes = await fetch(`https://queue.fal.run/fal-ai/ffmpeg-bridge/requests/${requestId}`, {
      headers: { "Authorization": `Key ${falKey}` }
    });
    const pollData = await pollRes.json();
    status = pollData.status;
    if (status === "COMPLETED") finalUrl = pollData.response.output_url;
    if (status === "FAILED") throw new Error("FFmpeg stitching failed on server.");
  }

  return finalUrl;
};

export interface MasterVideoResponse {
  url: string;
}

/**
 * Orchestrate per-scene rendering and final stitching
 */
export const generateMasterVideo = async (
  script: VideoScript, 
  falKey: string,
  onProgress?: (msg: string) => void
): Promise<MasterVideoResponse> => {
  const videoUrls: string[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    onProgress?.(`Processing Scene ${i + 1} of ${script.scenes.length}...`);
    
    let sceneVideoUrl = "";
    if (scene.assetUrl && scene.assetType === 'video') {
      sceneVideoUrl = scene.assetUrl;
    } else {
      onProgress?.(`Rendering Scene ${i + 1}: ${scene.text.substring(0, 30)}...`);
      sceneVideoUrl = await generateVideo(scene.visualPrompt);
    }
    videoUrls.push(sceneVideoUrl);
  }

  onProgress?.("Stitching final cut with FFmpeg...");
  const masterUrl = await stitchVideosFal(videoUrls, falKey);

  return { url: masterUrl };
};
