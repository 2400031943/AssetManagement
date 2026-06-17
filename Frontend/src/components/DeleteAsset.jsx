import React, { useState, useEffect, useRef } from "react";
import {
  Trash2, Loader2, ServerCrash, AlertCircle, CheckCircle2,
  ChevronDown, Search, RefreshCw, ShieldAlert, X
} from "lucide-react";
import { getMyAcms2027Assets, requestAssetDelete, getApprovers, getRegistrars, getDDs } from "../api";
import "../pages/Dashboard.css";

// SearchablePersonSelect
function SearchablePersonSelect({ label, list, selected, setter }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef           = useRef(null);
  const inputRef          = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 30);
    } else if (!open) {
      setQuery("");
    }
  }, [open]);

  const filtered = query.trim()
    ? list.filter(p =>
        (p.name || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.ecno || "").toLowerCase().includes(query.toLowerCase())
      )
    : list;

  const handleSelect = (person) => { setter(person); setOpen(false); setQuery(""); };
  const handleClear  = (e)      => { e.stopPropagation(); setter(null); setQuery(""); setOpen(false); };

  const baseBox = {
    width: "100%", padding: "0.45rem 2.2rem 0.45rem 0.75rem",
    background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.18)",
    borderRadius: 8, color: "#e2e8f0", fontSize: "0.83rem", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "relative", userSelect: "none", minHeight: "2.1rem",
    transition: "border-color 0.2s",
    ...(open ? { borderColor: "#ef4444" } : {}),
  };

  return (
    <div ref={wrapRef} style={{ marginBottom: "0.85rem", position: "relative" }}>
      <label style={{ display: "block", fontSize: "0.73rem", color: "var(--text-muted)", marginBottom: "0.28rem", fontWeight: 600, letterSpacing: "0.04em" }}>
        {label}
      </label>
      <div style={baseBox} onClick={() => setOpen(v => !v)}>
        {selected ? (
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
            <span style={{ fontWeight: 700, color: "#fca5a5" }}>{selected.ecno}</span>
            {" · "}{selected.name}
          </span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem" }}>-- Select {label} --</span>
        )}
        <span style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2 }}>
          {selected && (
            <span onClick={handleClear} title="Clear" style={{ cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", padding: "0 2px" }}>x</span>
          )}
          <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.4)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 9999,
          background: "#1e1b2e", border: "1.5px solid rgba(239,68,68,0.4)",
          borderRadius: 9, boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
          maxHeight: 240, display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{ padding: "0.5rem 0.65rem", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 6 }}>
            <Search size={13} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } }}
              placeholder="Search by name or EC No..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#e2e8f0", fontSize: "0.8rem" }}
            />
            {query && <span onClick={() => setQuery("")} style={{ cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>x</span>}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {list.length === 0 && (
              <div style={{ padding: "0.75rem 1rem", fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
                No personnel available (remote DB may be offline)
              </div>
            )}
            {filtered.length === 0 && list.length > 0 && (
              <div style={{ padding: "0.75rem 1rem", fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
                No matches for "{query}"
              </div>
            )}
            {filtered.map(p => (
              <div
                key={p.ecno}
                onClick={() => handleSelect(p)}
                style={{
                  padding: "0.5rem 0.85rem", cursor: "pointer", fontSize: "0.8rem",
                  background: selected && selected.ecno === p.ecno ? "rgba(239,68,68,0.15)" : "transparent",
                  borderLeft: selected && selected.ecno === p.ecno ? "3px solid #ef4444" : "3px solid transparent",
                  transition: "background 0.15s", display: "flex", flexDirection: "column", gap: 2,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background = (selected && selected.ecno === p.ecno) ? "rgba(239,68,68,0.15)" : "transparent"}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#fca5a5", fontSize: "0.78rem", flexShrink: 0 }}>{p.ecno}</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{p.name}</span>
                </span>
                {(p.groupName || p.divisionName || p.sectionName) && (
                  <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.32)", paddingLeft: 2, display: "flex", flexWrap: "wrap", gap: "0 6px" }}>
                    {p.groupName    && <span>Grp: {p.groupName}</span>}
                    {p.divisionName && <span>Div: {p.divisionName}</span>}
                    {p.sectionName  && <span>Sec: {p.sectionName}</span>}
                  </span>
                )}
              </div>
            ))}
          </div>
          {list.length > 0 && (
            <div style={{ padding: "0.3rem 0.85rem", borderTop: "1px solid rgba(255,255,255,0.07)", fontSize: "0.68rem", color: "rgba(255,255,255,0.28)" }}>
              {filtered.length} of {list.length} shown
            </div>
          )}
        </div>
      )}

      {selected && (
        <div style={{
          marginTop: "0.4rem", background: "rgba(239,68,68,0.07)",
          border: "1px solid rgba(239,68,68,0.2)", borderRadius: 7,
          padding: "0.4rem 0.75rem", fontSize: "0.75rem", color: "#fca5a5",
          display: "flex", flexWrap: "wrap", gap: "0 0.6rem",
        }}>
          <span style={{ fontWeight: 700 }}>{selected.ecno}</span>
          <span>.</span>
          <span>{selected.name}</span>
          {selected.divisionName && <span style={{ opacity: 0.7 }}> - {selected.divisionName}</span>}
        </div>
      )}
    </div>
  );
}

// Asset card
function AcmsAssetCard({ asset, selected, onToggle }) {
  return (
    <div
      onClick={() => onToggle(asset.id)}
      style={{
        background: selected ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.04)",
        border: selected ? "1.5px solid rgba(239,68,68,0.55)" : "1.5px solid rgba(255,255,255,0.1)",
        borderRadius: 14, padding: "1rem 1.2rem", cursor: "pointer",
        transition: "all 0.2s", position: "relative",
        boxShadow: selected ? "0 0 16px rgba(239,68,68,0.12)" : "none",
      }}
    >
      <div style={{
        position: "absolute", top: "0.85rem", right: "0.85rem",
        width: 20, height: 20, borderRadius: 5,
        background: selected ? "#ef4444" : "rgba(255,255,255,0.08)",
        border: selected ? "2px solid #ef4444" : "2px solid rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s",
      }}>
        {selected && <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 900 }}>v</span>}
      </div>

      <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.95rem", color: "#e2e8f0", marginBottom: "0.3rem", paddingRight: "2rem" }}>
        {asset.assetNumber || asset.serialNumber || ("ACMS-" + asset.id)}
        {asset.assetNumber && asset.serialNumber && (
          <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>
            - SN: {asset.serialNumber}
          </span>
        )}
      </div>

      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: "0.35rem 0.75rem", marginBottom: "0.4rem" }}>
        {asset.CATEGORY && <span>Category: {asset.CATEGORY}</span>}
        {asset.make     && <span>Make: {asset.make}{asset.model ? (" " + asset.model) : ""}</span>}
        {asset.AREA     && <span>Area: {asset.AREA}</span>}
        {asset.networkDomain && <span>Domain: {asset.networkDomain}</span>}
      </div>

      {asset.acmsFms && (
        <span style={{
          display: "inline-block",
          background: "rgba(239,68,68,0.15)", color: "#fca5a5",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 20, padding: "1px 10px", fontSize: "0.68rem", fontWeight: 700,
        }}>
          {asset.acmsFms}
        </span>
      )}
    </div>
  );
}

// Approval Modal
function ApprovalModal({ selectedAssets, approvers, registrars, dds, onClose, onSubmit, submitting }) {
  const [approver,  setApprover]  = useState(null);
  const [registrar, setRegistrar] = useState(null);
  const [dd,        setDD]        = useState(null);
  const [remarks,   setRemarks]   = useState("");

  const remarksOk = remarks.trim().length >= 10;
  const canSubmit = approver && registrar && dd && remarksOk && !submitting;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1a1625 0%, #12101e 100%)",
        border: "1.5px solid rgba(239,68,68,0.3)",
        borderRadius: 18, padding: "1.8rem 2rem", width: "100%", maxWidth: 480,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.4rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <ShieldAlert size={20} style={{ color: "#ef4444" }} />
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fca5a5" }}>
                Request Deletion Approval
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {selectedAssets.length} asset{selectedAssets.length > 1 ? "s" : ""} selected for removal from ACMS 2027
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1.4rem",
        }}>
          <div style={{ fontSize: "0.7rem", color: "#fca5a5", fontWeight: 700, marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Assets to be deleted
          </div>
          {selectedAssets.map(a => (
            <div key={a.id} style={{ fontSize: "0.78rem", color: "#e2e8f0", fontFamily: "monospace", padding: "1px 0" }}>
              [DEL] {a.assetNumber || a.serialNumber || ("ACMS-" + a.id)}
              {a.make && <span style={{ color: "var(--text-muted)", fontFamily: "sans-serif" }}> - {a.make} {a.model || ""}</span>}
            </div>
          ))}
        </div>

        {/* Reason / Remarks — required */}
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={{
            display: "block", fontSize: "0.73rem", color: "var(--text-muted)",
            marginBottom: "0.28rem", fontWeight: 600, letterSpacing: "0.04em",
          }}>
            Reason for Deletion <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Please explain why this asset needs to be removed from the ACMS 2027 list... (minimum 10 characters)"
            rows={3}
            style={{
              width: "100%", padding: "0.6rem 0.75rem",
              background: "rgba(255,255,255,0.06)",
              border: `1.5px solid ${remarks.trim().length > 0 && !remarksOk ? "#ef4444" : remarks.trim().length >= 10 ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.15)"}`,
              borderRadius: 8, color: "#e2e8f0", fontSize: "0.82rem",
              resize: "vertical", outline: "none", fontFamily: "inherit",
              transition: "border-color 0.2s", boxSizing: "border-box",
              lineHeight: 1.5,
            }}
          />
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: "0.25rem", fontSize: "0.68rem",
          }}>
            <span style={{ color: remarks.trim().length > 0 && !remarksOk ? "#fca5a5" : "var(--text-muted)" }}>
              {remarks.trim().length > 0 && !remarksOk ? "Minimum 10 characters required" : "Be specific — this will be visible to all approvers"}
            </span>
            <span style={{ color: remarksOk ? "rgba(34,197,94,0.8)" : "var(--text-muted)" }}>
              {remarks.trim().length} chars
            </span>
          </div>
        </div>

        <SearchablePersonSelect label="Approver"         list={approvers}  selected={approver}  setter={setApprover}  />
        <SearchablePersonSelect label="Area Focal Point" list={registrars} selected={registrar} setter={setRegistrar} />
        <SearchablePersonSelect label="DD"               list={dds}        selected={dd}        setter={setDD}        />

        <div style={{
          background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 8, padding: "0.6rem 0.9rem", marginBottom: "1.2rem",
          fontSize: "0.73rem", color: "#fca5a5", display: "flex", gap: "0.5rem", alignItems: "flex-start",
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Once approved by all 4 levels (Approver, AFP, DD, Admin), the asset will be permanently removed from the ACMS 2027 list.</span>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1, padding: "0.65rem", borderRadius: 9, cursor: "pointer",
              background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)",
              color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ approver, registrar, dd, remarks: remarks.trim() })}
            disabled={!canSubmit}
            style={{
              flex: 2, padding: "0.65rem", borderRadius: 9, cursor: canSubmit ? "pointer" : "not-allowed",
              background: canSubmit ? "linear-gradient(135deg, #ef4444, #dc2626)" : "rgba(239,68,68,0.3)",
              border: "none", color: "#fff", fontSize: "0.85rem", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              transition: "all 0.2s", boxShadow: canSubmit ? "0 4px 16px rgba(239,68,68,0.35)" : "none",
            }}
          >
            {submitting
              ? <Loader2 size={16} className="spin" />
              : <Trash2 size={16} />
            }
            {submitting ? "Submitting..." : "Submit Deletion Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function DeleteAsset() {
  const [assets,           setAssets]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [loadError,        setLoadError]        = useState(null);
  const [selected,         setSelected]         = useState(new Set());
  const [showModal,        setShowModal]        = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [toast,            setToast]            = useState(null);
  const [approvers,        setApprovers]        = useState([]);
  const [registrars,       setRegistrars]       = useState([]);
  const [dds,              setDDs]              = useState([]);
  const [personnelLoaded,  setPersonnelLoaded]  = useState(false);

  const fetchAssets = () => {
    setLoading(true);
    setLoadError(null);
    setSelected(new Set());
    getMyAcms2027Assets()
      .then(data => setAssets(Array.isArray(data) ? data : []))
      .catch(err => setLoadError(err.message || "Failed to load ACMS assets."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAssets(); }, []);

  const loadPersonnel = () => {
    if (personnelLoaded) return;
    Promise.all([getApprovers(), getRegistrars(), getDDs()])
      .then(([a, r, d]) => {
        setApprovers(Array.isArray(a) ? a : []);
        setRegistrars(Array.isArray(r) ? r : []);
        setDDs(Array.isArray(d) ? d : []);
        setPersonnelLoaded(true);
      })
      .catch(err => console.error("Failed to load personnel:", err));
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleOpenModal = () => {
    loadPersonnel();
    setShowModal(true);
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const handleSubmit = async ({ approver, registrar, dd, remarks }) => {
    setSubmitting(true);
    const selectedAssets = assets.filter(a => selected.has(a.id));
    const errors = [];
    let successCount = 0;

    for (const asset of selectedAssets) {
      try {
        await requestAssetDelete({
          acmsListId:       asset.id,
          approverEcno:     approver.ecno,
          approverName:     approver.name,
          registrarEcno:    registrar.ecno,
          registrarName:    registrar.name,
          ddEcno:           dd.ecno,
          ddName:           dd.name,
          requesterRemarks: remarks,
        });
        successCount++;
      } catch (err) {
        errors.push((asset.assetNumber || asset.serialNumber || ("ACMS-" + asset.id)) + ": " + err.message);
      }
    }

    setSubmitting(false);
    setShowModal(false);
    setSelected(new Set());

    if (errors.length === 0) {
      showToast("success", successCount + " deletion request" + (successCount > 1 ? "s" : "") + " submitted successfully!");
      fetchAssets();
    } else if (successCount > 0) {
      showToast("success", successCount + " submitted. " + errors.length + " failed.");
    } else {
      showToast("error", "Submission failed: " + errors.join("; "));
    }
  };

  const selectedAssets = assets.filter(a => selected.has(a.id));

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(239,68,68,0.15)", border: "1.5px solid rgba(239,68,68,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Trash2 size={18} style={{ color: "#ef4444" }} />
          </div>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#e2e8f0" }}>
            Delete Asset from ACMS List
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", paddingLeft: "2.7rem" }}>
          Select assets from your ACMS 2027 list and submit a deletion request for multi-level approval.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: "1.2rem", right: "1.2rem", zIndex: 99999,
          background: toast.type === "success" ? "rgba(22,163,74,0.95)" : "rgba(220,38,38,0.95)",
          color: "#fff", borderRadius: 12, padding: "0.9rem 1.4rem",
          display: "flex", alignItems: "center", gap: "0.6rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)", fontSize: "0.88rem", fontWeight: 600,
          maxWidth: 380, backdropFilter: "blur(8px)",
        }}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
          {loading ? "Loading..." : (assets.length + " asset" + (assets.length !== 1 ? "s" : "") + " in your ACMS 2027 list")}
          {selected.size > 0 && (
            <span style={{ marginLeft: "0.75rem", color: "#fca5a5", fontWeight: 700 }}>
              - {selected.size} selected
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            onClick={fetchAssets}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 8, padding: "0.45rem 0.85rem", cursor: loading ? "not-allowed" : "pointer",
              color: "var(--text-muted)", fontSize: "0.8rem",
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleOpenModal}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                border: "none", borderRadius: 9, padding: "0.5rem 1.1rem",
                cursor: "pointer", color: "#fff", fontSize: "0.85rem", fontWeight: 700,
                boxShadow: "0 4px 16px rgba(239,68,68,0.35)", transition: "all 0.2s",
              }}
            >
              <Trash2 size={15} />
              Request to Delete ({selected.size})
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", padding: "4rem 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
          <Loader2 size={22} style={{ color: "#ef4444" }} />
          Loading your ACMS assets...
        </div>
      )}

      {/* Error */}
      {!loading && loadError && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem", padding: "1.25rem 1.5rem",
          background: "rgba(239,68,68,0.07)", border: "1.5px solid rgba(239,68,68,0.25)",
          borderRadius: 12, color: "#fca5a5", fontSize: "0.88rem",
        }}>
          <ServerCrash size={20} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>Could not load assets</div>
            <div style={{ opacity: 0.75 }}>{loadError}</div>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !loadError && assets.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", padding: "4rem 0", color: "var(--text-muted)", textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Trash2 size={28} style={{ color: "rgba(239,68,68,0.5)" }} />
          </div>
          <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "#e2e8f0" }}>No ACMS assets found</div>
          <div style={{ fontSize: "0.8rem", maxWidth: 340 }}>
            You have no assets registered in the ACMS 2027 list.
            Once assets are approved and added, they will appear here.
          </div>
        </div>
      )}

      {/* Asset grid */}
      {!loading && !loadError && assets.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.9rem" }}>
          {assets.map(asset => (
            <AcmsAssetCard
              key={asset.id}
              asset={asset}
              selected={selected.has(asset.id)}
              onToggle={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {showModal && (
        <ApprovalModal
          selectedAssets={selectedAssets}
          approvers={approvers}
          registrars={registrars}
          dds={dds}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}
