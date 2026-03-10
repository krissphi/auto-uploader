
import { ScissorsIcon, FolderIcon, UploadIcon, MovieIcon, SettingsIcon } from "../shared/Icons";

export type PageKey = 'auto-clipper' | 'auto-uploader' | 'files' | 'settings' | 'broll-manager';

interface SidebarProps {
  currentPage: PageKey;
  setPage: (page: PageKey) => void;
}

export const Sidebar = ({ currentPage, setPage }: SidebarProps) => {
  const menuItems: { id: PageKey; label: string; icon: React.ReactNode }[] = [
    { id: 'auto-clipper', label: 'Get Clip', icon: <ScissorsIcon size={18} /> },
    { id: 'files', label: 'Manage Video', icon: <FolderIcon size={18} /> },
    { id: 'auto-uploader', label: 'Schedule Upload', icon: <UploadIcon size={18} /> },
    { id: 'broll-manager', label: 'B-Roll Asset', icon: <MovieIcon size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>KlipKlop v2</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-link ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
