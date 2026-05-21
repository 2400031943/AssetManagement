import React from 'react';
import {
  X, Monitor, FileText, Tag, Hash, Cpu, Globe,
  MapPin, Users, Briefcase, Shield, Calendar, Wifi, Server
} from 'lucide-react';
import '../pages/Dashboard.css';

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="modal-detail-row">
      <span className="modal-detail-label">{label}</span>
      <span className="modal-detail-value">{value}</span>
    </div>
  );
}

function DetailSection({ icon: Icon, title, children }) {
  return (
    <div className="modal-section">
      <div className="modal-section-header">
        <Icon size={16} />
        <span>{title}</span>
      </div>
      <div className="modal-section-body">{children}</div>
    </div>
  );
}

export default function AssetDetailModal({ asset, onClose }) {
  if (!asset) return null;

  const category = asset.CATEGORY || asset.category || '—';
  const isServer = category.toLowerCase().includes('server');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel glass-panel animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-asset-icon">
              {isServer ? <Server size={22} /> : <Monitor size={22} />}
            </div>
            <div>
              <h2 className="modal-title">{asset.name}</h2>
              <span className="asset-category-badge" style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                {category}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="modal-body">

          {/* Identification */}
          <DetailSection icon={Tag} title="Identification">
            <DetailRow label="Asset Name"       value={asset.name} />
            <DetailRow label="Category"         value={category} />
            <DetailRow label="Serial Number"    value={asset.serialNumber} />
            <DetailRow label="Make"             value={asset.make} />
            <DetailRow label="Model"            value={asset.model} />
          </DetailSection>

          {/* Network */}
          <DetailSection icon={Wifi} title="Network">
            <DetailRow label="Network Domain"   value={asset.networkDomain} />
            <DetailRow label="IP Address"       value={asset.ipAddress} />
          </DetailSection>

          {/* Configuration */}
          {asset.configuration && (
            <DetailSection icon={Cpu} title="Configuration">
              <div className="modal-config-block">{asset.configuration}</div>
            </DetailSection>
          )}

          {/* Hardware */}
          <DetailSection icon={Monitor} title="Hardware">
            <DetailRow label="Monitor"          value={asset.Monitor || asset.monitor} />
          </DetailSection>

          {/* Organisation */}
          <DetailSection icon={Briefcase} title="Organisation">
            <DetailRow label="Asset Custodian EC No"  value={asset.AssetCustodianECNO || asset.asset_custodian_ecno} />
            <DetailRow label="User Division"           value={asset.UserDivision || asset.user_division} />
            <DetailRow label="Group"                   value={asset.GROUP || asset.group_name} />
            <DetailRow label="Assigned To"             value={asset.assignedUserName} />
          </DetailSection>

          {/* Location */}
          <DetailSection icon={MapPin} title="Location">
            <DetailRow label="Area"             value={asset.AREA || asset.area} />
            <DetailRow label="Location"         value={asset.LOCATION || asset.location} />
          </DetailSection>

          {/* Compliance */}
          <DetailSection icon={Shield} title="Compliance">
            <DetailRow label="ACMS / FMS"       value={asset.acmsFms || asset.acms_fms} />
            <DetailRow label="FMS Expiry Date"  value={asset.fmsExpiryDate || asset.fms_expiry_date} />
            <DetailRow label="Status"           value={asset.status} />
          </DetailSection>

        </div>
      </div>
    </div>
  );
}
