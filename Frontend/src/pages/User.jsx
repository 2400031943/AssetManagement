import React, { useState, useEffect } from 'react';
import { LogOut, Database, LayoutDashboard, PlusCircle } from 'lucide-react';
import { useNavigate } from '../routes';
import MyAssets from '../components/MyAssets';
import AddAsset from '../components/AddAsset';
import './Dashboard.css';

export default function User() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-assets');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching from MSSQL backend
    const fetchAssets = async () => {
      setLoading(true);
      setTimeout(() => {
        setAssets([
          { id: 1, name: 'Dell Monitor 24"', category: 'IT Systems', serialNumber: 'SN-12345', make: 'Dell', model: 'UltraSharp', ipAddress: '192.168.1.10' },
          { id: 2, name: 'Office Desk', category: 'Furniture', serialNumber: 'FR-9981', make: 'IKEA', model: 'Bekant', ipAddress: 'N/A' },
          { id: 3, name: 'HP ProBook', category: 'IT Systems', serialNumber: 'HP-5544', make: 'HP', model: 'G8', ipAddress: '192.168.1.45' },
        ]);
        setLoading(false);
      }, 1000);
    };

    fetchAssets();
  }, []);

  const handleLogout = () => {
    navigate('/');
  };

  const handleAddAsset = (newAsset) => {
    const assetWithId = {
      ...newAsset,
      id: Date.now(), // Generate a mock ID
    };
    setAssets(prevAssets => [...prevAssets, assetWithId]);
    setActiveTab('my-assets'); // Switch to "My Assets" tab automatically
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar glass-panel">
        <div className="sidebar-header">
          <Database className="dashboard-logo-icon" size={28} />
          <span className="sidebar-title">Asset Manager</span>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'my-assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-assets')}
          >
            <LayoutDashboard size={20} />
            <span>My Assets</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'add-asset' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-asset')}
          >
            <PlusCircle size={20} />
            <span>Add Asset</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-profile-icon">J</div>
            <div className="user-profile-info">
              <span className="user-profile-name">John Doe</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn full-width" style={{ marginTop: '0.5rem' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main-content">
        {activeTab === 'my-assets' && <MyAssets assets={assets} loading={loading} />}
        {activeTab === 'add-asset' && <AddAsset onAddAsset={handleAddAsset} />}
      </main>
    </div>
  );
}
