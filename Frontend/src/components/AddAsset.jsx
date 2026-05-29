import React, { useState } from 'react';
import { Save } from 'lucide-react';
import '../pages/Dashboard.css';

export default function AddAsset({ onAddAsset }) {
  const [formData, setFormData] = useState({
    name: '',
    serialNumber: '',
    make: '',
    makeOther: '',
    model: '',
    modelOther: '',
    configuration: '',
    networkDomain: '',
    networkDomainOther: '',
    ipAddress: '',
    acmsFms: '',
    fmsExpiryDate: '',
    Monitor: '',
    MonitorCustom: '',
    AssetCustodianECNO: '',
    UserDivision: '',
    UserDivisionOther: '',
    GROUP: '',
    GROUPOther: '',
    AREA: '',
    AREAOther: '',
    CATEGORY: '',
    CATEGORYOther: '',
    LOCATION: '',
    LOCATIONOther: '',
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
      make: formData.make === 'Others' ? formData.makeOther : formData.make,
      model: formData.model === 'Others' ? formData.modelOther : formData.model,
      networkDomain: formData.networkDomain === 'Others' ? formData.networkDomainOther : formData.networkDomain,
      Monitor: formData.Monitor === 'Custom' ? formData.MonitorCustom : formData.Monitor,
      UserDivision: formData.UserDivision === 'Others' ? formData.UserDivisionOther : formData.UserDivision,
      GROUP: formData.GROUP === 'Others' ? formData.GROUPOther : formData.GROUP,
      AREA: formData.AREA === 'Others' ? formData.AREAOther : formData.AREA,
      CATEGORY: formData.CATEGORY === 'Others' ? formData.CATEGORYOther : formData.CATEGORY,
      LOCATION: formData.LOCATION === 'Others' ? formData.LOCATIONOther : formData.LOCATION,
      acmsFms: formData.acmsFms,
      fmsExpiryDate: formData.acmsFms === 'FMS' ? formData.fmsExpiryDate : '',
    };

    try {
      await onAddAsset(payload);  // parent (User.jsx) calls createAsset via api.js
      setStatus({ type: 'success', message: 'Asset added successfully!' });
      setFormData({
        name: '',
        serialNumber: '',
        make: '', makeOther: '',
        model: '', modelOther: '',
        configuration: '',
        networkDomain: '', networkDomainOther: '',
        ipAddress: '',
        acmsFms: '',
        fmsExpiryDate: '',
        Monitor: '', MonitorCustom: '',
        AssetCustodianECNO: '',
        UserDivision: '', UserDivisionOther: '',
        GROUP: '', GROUPOther: '',
        AREA: '', AREAOther: '',
        CATEGORY: '', CATEGORYOther: '',
        LOCATION: '', LOCATIONOther: '',
      });
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to save asset. Please try again.' });
    }
  };

  return (
    <div className="add-asset-container animate-fade-in">
      <h2 className="section-title">Select your asset to add into ACMS List</h2>
      
      {status.message && (
        <div className={`status-banner ${status.type}`}>
          {status.message}
        </div>
      )}

      <form className="asset-form glass-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* CATEGORY */}
          <div className="form-group">
            <label>CATEGORY *</label>
            <select name="CATEGORY" value={formData.CATEGORY} onChange={handleChange} required className="login-input">
              <option value="">Select CATEGORY...</option>
              <option value="SERVER TYPE 1">SERVER TYPE 1</option>
              <option value="SERVER TYPE 2">SERVER TYPE 2</option>
              <option value="PC TYPE 1">PC TYPE 1</option>
              <option value="PC TYPE 2">PC TYPE 2</option>
              <option value="PC TYPE 3">PC TYPE 3</option>
              <option value="PC TYPE 4">PC TYPE 4</option>
              <option value="STORAGE TYPE 2">STORAGE TYPE 2</option>
              <option value="PRINTER TYPE 1">PRINTER TYPE 1</option>
              <option value="PRINTER TYPE 2">PRINTER TYPE 2</option>
              <option value="SP TYPE 1">SP TYPE 1</option>
              <option value="SP TYPE 2">SP TYPE 2</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.CATEGORY === 'Others' && (
            <div className="form-group">
              <label>Specify CATEGORY *</label>
              <input type="text" name="CATEGORYOther" value={formData.CATEGORYOther} onChange={handleChange} required className="login-input" />
            </div>
          )}

          {/* Asset Name */}
          <div className="form-group">
            <label>Asset Name *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required className="login-input" placeholder="Enter Asset Name" />
          </div>

          {/* Asset Serial Number */}
          <div className="form-group">
            <label>System Serial Number *</label>
            <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} required className="login-input" />
          </div>

          {/* Make */}
          <div className="form-group">
            <label>Make *</label>
            <select name="make" value={formData.make} onChange={handleChange} required className="login-input">
              <option value="">Select Make...</option>
              <option value="HP">HP</option>
              <option value="Dell">Dell</option>
              <option value="Cisco">Cisco</option>
              <option value="Sony">Sony</option>
              <option value="Toshiba">Toshiba</option>
              <option value="Konika">Konika</option>
              <option value="NetApp">NetApp</option>
              <option value="HPE">HPE</option>
              <option value="NetASQ">NetASQ</option>
              <option value="D-link">D-link</option>
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
              <option value="Power edge R 730">Power edge R 730</option>
              <option value="HP Compaq 8200 CM">HP Compaq 8200 CM</option>
              <option value="HP ProDesk 600 G1">HP ProDesk 600 G1</option>
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
              <option value="Internet">Internet</option>
              <option value="SpaceNet">SpaceNet</option>
              <option value="ASDMLAN">ASDMLAN</option>
              <option value="RSAA Data">RSAA Data</option>
              <option value="Not in any Network">Not in any Network</option>
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

{/* Monitor*/}
          <div className="form-group">
            <label>Monitor</label>
            <select name="Monitor" value={formData.Monitor} onChange={handleChange} className="login-input">
              <option value="">Select Monitor...</option>
              <option value="Internet">NIL</option>

              <option value="Custom">Custom</option>
            </select>
          </div>
          {formData.Monitor === 'Custom' && (
            <div className="form-group">
              <label>Monitor</label>
              <input type="text" name="MonitorCustom" value={formData.MonitorCustom} onChange={handleChange} className="login-input" />
            </div>
          )}




           {/* Asset Custodian ECNO */}
          <div className="form-group">
            <label>Asset Custodian ECNO *</label>
            <input type="text" name="AssetCustodianECNO" value={formData.AssetCustodianECNO} onChange={handleChange} required className="login-input" />
          </div>


          {/* User Division */}
          <div className="form-group">
            <label>User Division</label>
            <select name="UserDivision" value={formData.UserDivision} onChange={handleChange} className="login-input">
              <option value="">Select User Division...</option>
              <option value="DPFD">DPFD</option>
              <option value="ASAG">ASAG</option>
              <option value="RSAA">RSAA</option>
              <option value="ASCID">ASCID</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.UserDivision === 'Others' && (
            <div className="form-group">
              <label>Specify User Division</label>
              <input type="text" name="UserDivisionOther" value={formData.UserDivisionOther} onChange={handleChange} className="login-input" />
            </div>
          )}


          {/* GROUP */}
          <div className="form-group">
            <label>GROUP</label>
            <select name="GROUP" value={formData.GROUP} onChange={handleChange} className="login-input">
              <option value="">Select GROUP...</option>
              <option value="SPFPG">SPFPG</option>
              <option value="ASAG">ASAG</option>
              <option value="RSAA">RSAA</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.GROUP === 'Others' && (
            <div className="form-group">
              <label>Specify GROUP</label>
              <input type="text" name="GROUPOther" value={formData.GROUPOther} onChange={handleChange} className="login-input" />
            </div>
          )}

          
          {/* AREA*/}
          <div className="form-group">
            <label>AREA</label>
            <select name="AREA" value={formData.AREA} onChange={handleChange} className="login-input">
              <option value="">Select AREA...</option>
              <option value="DPA">DPA</option>
              <option value="RSA">RSA</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.AREA === 'Others' && (
            <div className="form-group">
              <label>Specify AREA</label>
              <input type="text" name="AREAOther" value={formData.AREAOther} onChange={handleChange} className="login-input" />
            </div>
          )}




          
          {/* LOCATION */}
          <div className="form-group">
            <label>LOCATION</label>
            <select name="LOCATION" value={formData.LOCATION} onChange={handleChange} className="login-input">
              <option value="">Select LOCATION...</option>
              <option value="Balanagar">Balanagar</option>
              <option value="ASAG">Shadngar</option>
              <option value="RSAA">RSAA Datacentre Balanagar </option>
              <option value="Others">Others</option>
            </select>
          </div>
          {formData.LOCATION === 'Others' && (
            <div className="form-group">
              <label>Specify LOCATION</label>
              <input type="text" name="LOCATIONOther" value={formData.LOCATIONOther} onChange={handleChange} className="login-input" />
            </div>
          )}


          
          {/* ACMS/FMS */}
          <div className="form-group">
            <label>ACMS/FMS</label>
            <select name="acmsFms" value={formData.acmsFms} onChange={handleChange} className="login-input">
              <option value="">Select ACMS/FMS...</option>
              <option value="ACMS">ACMS</option>
              <option value="FMS">FMS</option>
            
            </select>
          </div>
          {formData.acmsFms === 'FMS' && (
            <div className="form-group">
              <label>Date of Expiry *</label>
              <input
                type="date"
                name="fmsExpiryDate"
                value={formData.fmsExpiryDate}
                onChange={handleChange}
                required
                className="login-input"
              />
            </div>
          )}
       

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
