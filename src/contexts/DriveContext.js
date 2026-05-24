// src/contexts/DriveContext.js
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { loadManifest, createRepo, addCommitToRepo, readPublicJsonFile } from "../utils/googleDrive";

const DriveContext = createContext(null);

export function DriveProvider({ children }) {
  const [repos, setRepos] = useState([]);
  const [loadingDrive, setLoadingDrive] = useState(true);

  const refreshRepos = useCallback(async () => {
    setLoadingDrive(true);
    try {
      const manifest = await loadManifest();
      setRepos(manifest.repos || []);
    } catch (e) {
      console.error("Failed to load repos:", e);
      setRepos([]);
    } finally {
      setLoadingDrive(false);
    }
  }, []);

  useEffect(() => { refreshRepos(); }, [refreshRepos]);

  const createNewRepo = useCallback(async ({ name, description, author }) => {
    const result = await createRepo({ name, description, author });
    await refreshRepos();
    return result;
  }, [refreshRepos]);

  const getRepo = useCallback(async (fileId) => {
    return readPublicJsonFile(fileId);
  }, []);

  const addCommit = useCallback(async (fileId, node) => {
    return addCommitToRepo(fileId, node);
  }, []);

  return (
    <DriveContext.Provider value={{ repos, loadingDrive, refreshRepos, createNewRepo, getRepo, addCommit }}>
      {children}
    </DriveContext.Provider>
  );
}

export function useDrive() {
  return useContext(DriveContext);
}
