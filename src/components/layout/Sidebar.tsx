

export type PageKey = 'auto-clipper' | 'auto-uploader' | 'files' | 'settings' | 'broll-manager';

interface SidebarProps {
  currentPage: PageKey;
  setPage: (page: PageKey) => void;
}

export const Sidebar = ({ currentPage, setPage }: SidebarProps) => {
  const menuItems: { id: PageKey; label: string; icon: string }[] = [
    { id: 'auto-clipper', label: 'Auto Clipper', icon: '✂️' },
    { id: 'auto-uploader', label: 'Auto Uploader', icon: '🚀' },
    { id: 'broll-manager', label: 'B-Roll Assets', icon: '🎞️' },
    { id: 'files', label: 'Files & Batches', icon: '📁' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
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
