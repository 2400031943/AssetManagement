import React, { useState } from 'react';
import { Save } from 'lucide-react';
import '../pages/Dashboard.css';

export default function AddAsset({ onAddAsset }) {
  const [formData, setFormData] = useState({
    category: '',
    categoryOther: '',
    name: '',
    nameOther: '',
    serialNumber: '',
    make: '',
    makeOther: '',
    model: '',
    modelOther: '',
    configuration: '',
    networkDomain: '',
    networkDomainOther: '',
    ipAddress: '',
  });

  const [status, setStatus] = useState({ type: null, message: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Saving asset...' });

    // Construct final data mapping "Other" fields
    const payload = {
      ...formData,
      category: formData.category === 'Others' ? formData.categoryOther : formData.category,
      name: formData.name === 'Others' ? formData.nameOther : formData.name,
      make: formData.make === 'Others' ? formData.makeOther : formData.make,
      model: formData.model === 'Others' ? formData.modelOther : formData.model,
      networkDomain: formData.networkDomain === 'Others' ? formData.networkDomainOther : formData.networkDomain,
    };

    // Simulate API call
    setTimeout(() => {
      console.log('Saving to MSSQL Backend:', payload);
      onAddAsset(payload);
      setStatus({ type: 'success', message: 'Asset added successfully!' });
      // Reset form
      setFormData({
        category: '', categoryOther: '',
        name: '', nameOther: '',
        serialNumber: '',
        make: '', makeOther: '',
        model: '', modelOther: '',
        configuration: '',
        networkDomain: '', networkDomainOther: '',
        ipAddress: '',
      });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    }, 1000);
  };

  return (
    <div className="add-asset-container animate-fade-in">
      <h2 className="section-title">Add New Asset</h2>
      
      {status.message && (
        <div className={`status-banner ${status.type}`}>
          {status.message}
        </div>
      )}

      <form className="asset-form glass-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Asset Category */}
          <div className="form-group">
            <label>Asset Category *</label>
            <select name="category" value={formData.category} onChange={handleChange} required className="login-input">
              <option value="">Select Category...</option>
              <option value="IT Systems">IT Systems</option>
              <option value="Furniture">Furniture</option>
              <option value="Electrical">Electrical</option>
              <option value="UPS">UPS</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.category === 'Others' && (
            <div className="form-group">
              <label>Specify Category *</label>
              <input type="text" name="categoryOther" value={formData.categoryOther} onChange={handleChange} required className="login-input" />
            </div>
          )}

          {/* Asset Name */}
          <div className="form-group">
            <label>Asset Name *</label>
            {formData.category === 'IT Systems' ? (
              <select name="name" value={formData.name} onChange={handleChange} required className="login-input">
                <option value="">Select Asset Name...</option>
                <option value="Printer">Printer</option>
                <option value="Monitor">Monitor</option>
                <option value="Server">Server</option>
                <option value="Network Switch">Network Switch</option>
                <option value="IP Phones">IP Phones</option>
                <option value="Firewall">Firewall</option>
                <option value="Router">Router</option>
                <option value="TV / Display Unit">TV / Display Unit</option>
                <option value="Others">Others</option>
              </select>
            ) : (
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="login-input" placeholder="Enter Asset Name" />
            )}
          </div>
          {formData.category === 'IT Systems' && formData.name === 'Others' && (
            <div className="form-group">
              <label>Specify Asset Name *</label>
              <input type="text" name="nameOther" value={formData.nameOther} onChange={handleChange} required className="login-input" />
            </div>
          )}

          {/* Asset Serial Number */}
          <div className="form-group">
            <label>Asset Serial Number *</label>
            <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} required className="login-input" />
          </div>

          {/* Make */}
          <div className="form-group">
            <label>Make *</label>
            <select name="make" value={formData.make} onChange={handleChange} required className="login-input">
              <option value="">Select Make...</option>
              <option value="HP">HP</option>
              <option value="Dell">Dell</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.make === 'Others' && (
            <div className="form-group">
              <label>Specify Make *</label>
              <input type="text" name="makeOther" value={formData.makeOther} onChange={handleChange} required className="login-input" />
            </div>
          )}

          {/* Model */}
          <div className="form-group">
            <label>Model *</label>
            <select name="model" value={formData.model} onChange={handleChange} required className="login-input">
              <option value="">Select Model...</option>
              <option value="Standard">Standard</option>
              <option value="Premium">Premium</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.model === 'Others' && (
            <div className="form-group">
              <label>Specify Model *</label>
              <input type="text" name="modelOther" value={formData.modelOther} onChange={handleChange} required className="login-input" />
            </div>
          )}

          {/* Network Domain */}
          <div className="form-group">
            <label>Network Domain</label>
            <select name="networkDomain" value={formData.networkDomain} onChange={handleChange} className="login-input">
              <option value="">Select Domain...</option>
              <option value="Intel">Intel</option>
              <option value="DP">DP</option>
              <option value="APP">APP</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.networkDomain === 'Others' && (
            <div className="form-group">
              <label>Specify Domain</label>
              <input type="text" name="networkDomainOther" value={formData.networkDomainOther} onChange={handleChange} className="login-input" />
            </div>
          )}

          {/* IP Address */}
          <div className="form-group">
            <label>IP Address</label>
            <input type="text" name="ipAddress" value={formData.ipAddress} onChange={handleChange} className="login-input" placeholder="e.g. 192.168.1.1" />
          </div>
          
          {/* Brief Configuration */}
          <div className="form-group full-width">
            <label>Brief Configuration</label>
            <textarea 
              name="configuration" 
              value={formData.configuration} 
              onChange={handleChange} 
              className="login-input" 
              rows="3"
              placeholder="Describe the asset configuration..."
            ></textarea>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn login-btn" disabled={status.type === 'loading'}>
            <Save size={18} />
            <span>{status.type === 'loading' ? 'Saving...' : 'Save Asset'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
