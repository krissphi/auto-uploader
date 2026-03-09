import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";
import "./App.css";

import { Sidebar, PageKey } from "./components/layout/Sidebar";
import { AutoClipper } from "./components/pages/AutoClipper";
import { AutoUploader } from "./components/pages/AutoUploader";
import { FilesPage } from "./components/pages/Files";
import { SettingsPage } from "./components/pages/Settings";

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('auto-clipper');

  useEffect(() => {
    const checkDeps = async () => {
      try {
        const missing: string[] = await invoke("check_dependencies");
        if (missing.length > 0) {
          await message(
            `KlipKlop Requires the following external tools to be installed on your system:\n\n` +
            missing.join('\n') +
            `\n\nPlease install them and ensure they are added to your System PATH to start using the automation features.`,
            { title: 'Missing System Dependencies', kind: 'warning' }
          );
        }
      } catch (err) {
        console.error("Failed to check dependencies:", err);
      }
    };
    checkDeps();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} setPage={setCurrentPage} />
      
      <main className="main-content">
        {currentPage === 'auto-clipper' && <AutoClipper />}
        {currentPage === 'auto-uploader' && <AutoUploader />}
        {currentPage === 'files' && <FilesPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
