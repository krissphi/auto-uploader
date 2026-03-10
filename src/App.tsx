import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { message } from "@tauri-apps/plugin-dialog";
import "./App.css";

import { Sidebar, PageKey } from "./components/layout/Sidebar";
import { AutoClipper } from "./components/pages/AutoClipper";
import { AutoUploader } from "./components/pages/AutoUploader";
import { FilesPage } from "./components/pages/Files";
import { SettingsPage } from "./components/pages/Settings";
import { BRollManager } from "./components/pages/BRollManager";

// Pages that have been visited at least once — they stay mounted to preserve state,
// but are hidden when not active. Pages never visited are never mounted at all.
type MountedSet = Partial<Record<PageKey, true>>;

function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('auto-clipper');
  const [mounted, setMounted] = useState<MountedSet>({ 'auto-clipper': true });

  const navigate = (page: PageKey) => {
    setCurrentPage(page);
    setMounted(prev => ({ ...prev, [page]: true }));
  };

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

  const show = (page: PageKey) => ({ display: currentPage === page ? 'block' : 'none', height: '100%' } as const);

  return (
    <div className="app-layout">
      <Sidebar currentPage={currentPage} setPage={navigate} />

      <main className="main-content">
        {/* Each page is only mounted (and its useEffects run) the first time the user visits it */}
        {mounted['auto-clipper']   && <div style={show('auto-clipper')}><AutoClipper /></div>}
        {mounted['auto-uploader']  && <div style={show('auto-uploader')}><AutoUploader /></div>}
        {mounted['broll-manager']  && <div style={show('broll-manager')}><BRollManager /></div>}
        {mounted['files']          && <div style={show('files')}><FilesPage /></div>}
        {mounted['settings']       && <div style={show('settings')}><SettingsPage /></div>}
      </main>
    </div>
  );
}

export default App;
