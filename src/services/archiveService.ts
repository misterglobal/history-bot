import { ArchiveItem, VideoScript } from '../types';

const ARCHIVE_KEY = 'histori_bot_archives';

export const getArchives = (): ArchiveItem[] => {
  try {
    const data = localStorage.getItem(ARCHIVE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load archives:', error);
    return [];
  }
};

export const saveArchive = (
  topic: string, 
  script: VideoScript, 
  masterVideoUrl: string | null
): ArchiveItem => {
  const archives = getArchives();
  
  // Create a clean copy of the script to avoid modifying state
  const cleanScript = { ...script, scenes: [...script.scenes] };
  
  // Strip base64 images to save space (localStorage has ~5MB limit)
  // We keep video URLs as they are just strings
  cleanScript.scenes = cleanScript.scenes.map(scene => {
    if (scene.assetType === 'image' && scene.assetUrl?.startsWith('data:')) {
      return { ...scene, assetUrl: undefined };
    }
    return scene;
  });

  const newItem: ArchiveItem = {
    id: crypto.randomUUID(),
    topic,
    timestamp: new Date().toISOString(),
    script: cleanScript,
    masterVideoUrl
  };

  // Add to beginning of list
  const updatedArchives = [newItem, ...archives];
  
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(updatedArchives));
    return newItem;
  } catch (error) {
    // If quota exceeded, try removing the oldest item
    if (archives.length > 0) {
        console.warn('Storage quota exceeded, removing oldest archive...');
        const truncated = [newItem, ...archives.slice(0, -1)];
        try {
            localStorage.setItem(ARCHIVE_KEY, JSON.stringify(truncated));
            return newItem;
        } catch (e) {
            throw new Error('Storage full. Please delete some archives.');
        }
    }
    throw error;
  }
};

export const deleteArchive = (id: string): void => {
  const archives = getArchives();
  const updated = archives.filter(item => item.id !== id);
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(updated));
};