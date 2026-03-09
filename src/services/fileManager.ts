import { invoke } from "@tauri-apps/api/core";

export const getDirectoryFiles = async (path: string): Promise<string[]> => {
    return await invoke('get_directory_files', { path });
};

export const getDirectories = async (path: string): Promise<string[]> => {
    return await invoke('get_directories', { path });
};

export const moveFile = async (source: string, dest: string): Promise<void> => {
    await invoke('move_file', { source, dest });
};

export const createDirAll = async (path: string): Promise<void> => {
    await invoke('create_dir_all', { path });
};

export const removeDirAll = async (path: string): Promise<void> => {
    await invoke('remove_dir_all', { path });
};
