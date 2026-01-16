/**
 * Service for Cartesia TTS generation and Fal.ai audio storage
 */

export const generateNarration = async (
    text: string,
    voiceId: string,
    apiKey: string
): Promise<Blob> => {
    if (!apiKey) throw new Error("Cartesia API Key is missing.");

    const response = await fetch("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: {
            "X-API-Key": apiKey,
            "Cartesia-Version": "2024-06-10",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model_id: "sonic-3",
            transcript: text,
            voice: {
                mode: "id",
                id: voiceId,
            },
            output_format: {
                container: "wav",
                encoding: "pcm_f32le",
                sample_rate: 44100,
            },
            speed: "normal",
            generation_config: {
                speed: 1,
                volume: 1,
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cartesia API Error (${response.status}): ${errorText}`);
    }

    return await response.blob();
};

/**
 * Upload a blob to fal.ai storage to get a public URL
 */
export const uploadToFal = async (blob: Blob, falKey: string, fileName: string = "file.wav"): Promise<string> => {
    if (!falKey) throw new Error("Fal.ai API Key is missing.");

    const formData = new FormData();
    formData.append("file", blob, fileName);

    // Using the modern fal.run endpoint. If status is 404, check if the key is valid.
    const response = await fetch("https://fal.run/storage/upload", {
        method: "POST",
        headers: {
            "Authorization": `Key ${falKey}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fal.ai Storage Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.url || data.file_url || data.file_path;
};
