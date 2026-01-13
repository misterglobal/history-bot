import { GoogleGenAI } from "@google/genai";
import { MODEL_TEXT } from "../constants";
import { VideoScript, SocialMetadata } from "../types";

// Helper to resolve Gemini key
const getGeminiKey = () => process.env.GEMINI_API_KEY || (typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : '');

/**
 * Generate viral titles and captions using Gemini
 */
export const generateSocialMetadata = async (script: VideoScript, apiKey?: string): Promise<SocialMetadata> => {
    const key = apiKey || getGeminiKey();
    if (!key) throw new Error("Gemini API Key is missing for metadata generation.");

    const ai = new GoogleGenAI({ apiKey: key });

    const prompt = `
    Based on the following historical video script, generate:
    1. A catchy YouTube Title (under 70 chars, includes emojis).
    2. A detailed YouTube Description (including hashtags).
    3. A punchy Instagram Reels Caption (with 10 viral history hashtags).

    Topic: ${script.topic}
    Hook: ${script.hook}
    Body: ${script.body}

    Return ONLY a JSON object with this structure:
    {
      "youtubeTitle": "string",
      "youtubeDescription": "string",
      "instagramCaption": "string"
    }
  `;

    const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: `You are a social media growth expert specializing in historical viral content. ${prompt}`,
        config: {
            responseMimeType: "application/json",
        },
    });

    try {
        const data = JSON.parse(response.text || '{}');
        return data as SocialMetadata;
    } catch (e) {
        console.error("Failed to parse social metadata", e);
        throw new Error("Invalid metadata format from AI.");
    }
};

/**
 * YouTube OAuth Redirect
 */
export const initiateYouTubeAuth = (clientId: string) => {
    const redirectUri = window.location.origin;
    const scope = "https://www.googleapis.com/auth/youtube.upload";
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=youtube`;
    window.location.href = authUrl;
};

/**
 * Exchange code for YouTube token
 */
export const finalizeYouTubeAuth = async (code: string, clientId: string, clientSecret: string) => {
    const redirectUri = window.location.origin;
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code"
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`YouTube Auth Failed: ${err.error_description || err.error}`);
    }

    return await response.json();
};

/**
 * YouTube Upload (Resumable)
 */
export const uploadToYouTube = async (videoBlob: Blob, metadata: SocialMetadata, accessToken: string) => {
    onProgressUpdate?.("Starting YouTube upload...");

    const snippet = {
        snippet: {
            title: metadata.youtubeTitle,
            description: metadata.youtubeDescription,
            categoryId: "27", // Education
            tags: ["history", "viral", "education"]
        },
        status: {
            privacyStatus: "private", // Default to private until project is verified
            selfDeclaredMadeForKids: false
        }
    };

    // Resumable upload initiation
    const response = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4"
        },
        body: JSON.stringify(snippet)
    });

    if (!response.ok) {
        throw new Error(`YouTube Upload Init Failed: ${response.statusText}`);
    }

    const uploadUrl = response.headers.get("Location");
    if (!uploadUrl) throw new Error("No upload URL returned from YouTube");

    onProgressUpdate?.("Transferring video bytes to YouTube...");
    const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: videoBlob
    });

    if (!uploadRes.ok) throw new Error(`YouTube Byte Transfer Failed: ${uploadRes.statusText}`);

    onProgressUpdate?.("✓ YouTube Upload Complete!");
    const data = await uploadRes.json();
    return `https://youtube.com/watch?v=${data.id}`;
};

/**
 * Instagram OAuth Redirect
 */
export const initiateInstagramAuth = (appId: string) => {
    const redirectUri = window.location.origin;
    const scope = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement";
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=instagram`;
    window.location.href = authUrl;
};

/**
 * Exchange code for Instagram/Meta token
 */
export const finalizeInstagramAuth = async (code: string, appId: string, appSecret: string) => {
    const redirectUri = window.location.origin;
    const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Meta Auth Failed: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const shortLivedToken = data.access_token;

    // We need to find the Instagram Business ID linked to the user's pages
    onProgressUpdate?.("Finding linked Instagram Business account...");
    const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${shortLivedToken}`);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
        throw new Error("No Facebook Pages found linked to this account.");
    }

    // Check first page for IG account
    const pageId = pagesData.data[0].id;
    const igRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${shortLivedToken}`);
    const igData = await igRes.json();

    if (!igData.instagram_business_account) {
        throw new Error("No Instagram Business account found linked to your Facebook Page.");
    }

    return {
        accessToken: shortLivedToken,
        igUserId: igData.instagram_business_account.id
    };
};

/**
 * Instagram Reel Upload
 */
export const uploadToInstagram = async (videoUrl: string, caption: string, accessToken: string, igUserId: string) => {
    onProgressUpdate?.("Creating Instagram media container...");

    // Step 1: Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            media_type: "REELS",
            video_url: videoUrl,
            caption: caption,
            access_token: accessToken
        })
    });

    const containerData = await containerRes.json();
    if (containerData.error) throw new Error(`IG Container Error: ${containerData.error.message}`);

    const creationId = containerData.id;

    // Step 2: Poll for processing completion
    onProgressUpdate?.("Waiting for Instagram to process video...");
    let ready = false;
    let attempts = 0;
    while (!ready && attempts < 30) {
        await new Promise(r => setTimeout(r, 5000));
        attempts++;
        const statusRes = await fetch(`https://graph.facebook.com/v18.0/${creationId}?fields=status_code,status&access_token=${accessToken}`);
        const statusData = await statusRes.json();
        if (statusData.status_code === "FINISHED") {
            ready = true;
        } else if (statusData.status_code === "ERROR") {
            throw new Error(`IG Processing Failed: ${statusData.status}`);
        }
    }

    // Step 3: Publish
    onProgressUpdate?.("Publishing Reel...");
    const publishRes = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            creation_id: creationId,
            access_token: accessToken
        })
    });

    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(`IG Publish Error: ${publishData.error.message}`);

    onProgressUpdate?.("✓ Instagram Reel Published!");
    return "https://instagram.com/reels/";
};

let onProgressUpdate: ((msg: string) => void) | null = null;
export const setSocialProgressCallback = (cb: (msg: string) => void) => {
    onProgressUpdate = cb;
};
