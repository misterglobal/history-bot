import { ProjectData } from '../types';

const STORAGE_KEY = 'histori_bot_archives';

export const getArchives = (): ProjectData[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse archives', e);
    return [];
  }
};

export const saveArchive = (project: ProjectData) => {
  try {
    const archives = getArchives();
    const index = archives.findIndex(a => a.id === project.id);
    
    if (index >= 0) {
      archives[index] = project;
    } else {
      archives.unshift(project); // Add to top
    }
    
    // Limit to 10 recent projects to avoid hitting localStorage limits (especially with base64 images)
    if (archives.length > 10) {
      archives.pop();
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
    return true;
  } catch (e) {
    console.warn('Failed to save archive (likely quota exceeded):', e);
    return false;
  }
};

export const deleteArchive = (id: string) => {
  const archives = getArchives().filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archives));
  return archives;
};

export const getArchive = (id: string): ProjectData | undefined => {
  return getArchives().find(a => a.id === id);
};