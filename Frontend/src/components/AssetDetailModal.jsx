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
  const assetCustodianEcno = asset.AssetCustodianECNO || asset.assetCustodianECNO || asset.asset_custodian_ecno;
  const currentUserEcno = asset.SystemCurrentUserECNO || asset['System-Current-User ECNO_(Refer Employee Directory)'] || asset.current_user_ecno || assetCustodianEcno;

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
              <h2 className="modal-title">{asset.assetNumber || asset.serialNumber || 'Asset Details'}</h2>
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
            <DetailRow label="Source"           value={asset.sourceTable} />
            <DetailRow label="SL No"            value={asset.slNo} />
            <DetailRow label="ACMS Code"        value={asset.acmsCode} />
            <DetailRow label="Asset Number_(Refer PIS Database)" value={asset.assetNumber} />
            <DetailRow label="Asset Number"     value={asset.assetNumber} />
            <DetailRow label="Category"         value={category} />
            <DetailRow label="System Serial Number" value={asset.serialNumber} />
            <DetailRow label="Make"             value={asset.make} />
            <DetailRow label="Model"            value={asset.model} />
          </DetailSection>

          {/* Network */}
          <DetailSection icon={Wifi} title="Network">
            <DetailRow label="Network Domain (Interent/Spacenet/NRSCVRF/DP etc)" value={asset.networkDomain} />
            <DetailRow label="IP"               value={asset.ipAddress} />
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
            <DetailRow label="Asset Custodian ECNO_(Refer PIS Database)" value={assetCustodianEcno} />
            <DetailRow label="System-Current-User ECNO_(Refer Employee Directory)" value={currentUserEcno} />
            <DetailRow label="User-Division _(Refer Employee Directory)" value={asset.UserDivision || asset.user_division} />
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
            <DetailRow label="ACMS, FMS, FMS + ACMS" value={asset.acmsFms || asset.acms_fms} />
            <DetailRow label="Warranty  _Expiry Date" value={asset.warrantyExpiryDate || asset.fmsExpiryDate || asset.fms_expiry_date} />
            <DetailRow label="Remarks"          value={asset.remarks} />
            <DetailRow label="Status"           value={asset.status} />
          </DetailSection>

        </div>
      </div>
    </div>
  );
}
