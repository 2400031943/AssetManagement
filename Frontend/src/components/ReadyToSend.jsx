import React, { useState, useEffect } from "react";
import { Send, Loader2, ChevronDown, Plus, X } from "lucide-react";
import {
  getDraftRequests,
  submitPendingRequests,
  getApprovers,
  getRegistrars,
  getDDs,
} from "../api";
import "../pages/Dashboard.css";

function SearchablePersonSelect({ label, list, selected, setter }) {
  const [open, setOpen]   = React.useState(false);
  const [query, setQuery] = React.useState("");
  const wrapRef           = React.useRef(null);
  const inputRef          = React.useRef(null);

  React.useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  React.useEffect(() => {
    if (open && inputRef.current) setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 30);
    else if (!open) setQuery("");
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
    width: "100%", padding: "0.42rem 2.2rem 0.42rem 0.7rem",
    background: "rgba(15,12,40,0.75)", border: "1.5px solid rgba(99,102,241,0.35)",
    borderRadius: 7, color: "#e2e8f0", fontSize: "0.82rem", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    position: "relative", userSelect: "none", minHeight: "2rem",
    transition: "border-color 0.2s",
    ...(open ? { borderColor: "#6c63ff" } : {}),
  };

  return (
    <div ref={wrapRef} style={{ marginBottom: "0.75rem", position: "relative" }}>
      <label style={{ display: "block", fontSize: "0.73rem", color: "var(--text-muted)", marginBottom: "0.28rem", fontWeight: 600, letterSpacing: "0.04em" }}>
        {label}
      </label>
      <div style={baseBox} onClick={() => setOpen(v => !v)}>
        {selected ? (
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
            <span style={{ fontWeight: 700, color: "#c4b5fd" }}>{selected.ecno}</span>
            <span style={{ color: "#f1f5f9", marginLeft: 4 }}>{selected.name}</span>
            {selected.designation && <span style={{ color: "#94a3b8", fontSize: "0.72rem", marginLeft: 4 }}> · {selected.designation}</span>}
          </span>
        ) : (
          <span style={{ color: "rgba(226,232,240,0.45)", fontSize: "0.8rem" }}>-- Select {label} --</span>
        )}
        <span style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2 }}>
          {selected && (
            <span onClick={handleClear} title="Clear" style={{ cursor: "pointer", color: "#94a3b8", fontSize: "0.75rem", padding: "0 2px" }}>x</span>
          )}
          <ChevronDown size={13} style={{ color: "#94a3b8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 9999,
          background: "#1e1b2e", border: "1.5px solid rgba(108,99,255,0.4)",
          borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", overflow: "hidden",
        }}>
          <div style={{ padding: "0.4rem" }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or EC no."
              style={{
                width: "100%", padding: "0.4rem 0.6rem", boxSizing: "border-box",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6, color: "#e2e8f0", fontSize: "0.8rem", outline: "none",
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "0.6rem 0.8rem", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>No results</div>
            ) : filtered.map((p, i) => (
              <div
                key={i}
                onClick={() => handleSelect(p)}
                style={{
                  padding: "0.45rem 0.8rem", cursor: "pointer", fontSize: "0.8rem",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: selected && selected.ecno === p.ecno ? "rgba(108,99,255,0.3)" : "transparent",
                  transition: "background 0.15s",
                  color: "#e2e8f0",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(108,99,255,0.18)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = (selected && selected.ecno === p.ecno) ? "rgba(108,99,255,0.3)" : "transparent"; }}
              >
                <span style={{ fontWeight: 700, color: "#c4b5fd", marginRight: 6 }}>{p.ecno}</span>
                <span style={{ color: "#f1f5f9" }}>{p.name}</span>
                {p.designation && <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}> · {p.designation}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReadyToSend() {
  const [drafts,            setDrafts]            = useState([]);
  const [draftsLoading,     setDraftsLoading]     = useState(true);
  const [selectedDraftIds,  setSelectedDraftIds]  = useState(new Set());
  const [approversList,     setApproversList]     = useState([]);
  const [registrarsList,    setRegistrarsList]    = useState([]);
  const [ddsList,           setDdsList]           = useState([]);
  const [dropdownsLoading,  setDropdownsLoading]  = useState(false);
  const [selectedApprover,  setSelectedApprover]  = useState(null);
  const [showApprover2,     setShowApprover2]     = useState(false);
  const [selectedApprover2, setSelectedApprover2] = useState(null);
  const [selectedRegistrar, setSelectedRegistrar] = useState(null);
  const [selectedDD,        setSelectedDD]        = useState(null);
  const [sendingForApproval,setSendingForApproval]= useState(false);
  const [sendResult,        setSendResult]        = useState(null);

  const fetchDrafts = () => {
    setDraftsLoading(true);
    getDraftRequests()
      .then(data => setDrafts(Array.isArray(data) ? data : []))
      .catch(() => setDrafts([]))
      .finally(() => setDraftsLoading(false));
  };

  useEffect(() => { fetchDrafts(); }, []);

  useEffect(() => {
    setDropdownsLoading(true);
    Promise.all([getApprovers(), getRegistrars(), getDDs()])
      .then(([a, r, d]) => {
        setApproversList(Array.isArray(a) ? a : []);
        setRegistrarsList(Array.isArray(r) ? r : []);
        setDdsList(Array.isArray(d) ? d : []);
      })
      .catch(() => {})
      .finally(() => setDropdownsLoading(false));
  }, []);

  const toggleDraft = (id) => {
    setSelectedDraftIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSendForApproval = async () => {
    if (!selectedApprover || !selectedRegistrar || !selectedDD) {
      alert("Please select Approver, Area Focal Point and DD before sending.");
      return;
    }
    if (selectedDraftIds.size === 0) {
      alert("Please select at least one request.");
      return;
    }
    setSendingForApproval(true);
    setSendResult(null);
    try {
      const res = await submitPendingRequests({
        draftIds:              Array.from(selectedDraftIds),
        approverEcno:          selectedApprover.ecno,
        approverName:          selectedApprover.name,
        approverDesignation:   selectedApprover.designation,
        approver2Ecno:         selectedApprover2?.ecno  || '',
        approver2Name:         selectedApprover2?.name  || '',
        registrarEcno:         selectedRegistrar.ecno,
        registrarName:         selectedRegistrar.name,
        registrarDesignation:  selectedRegistrar.designation,
        ddEcno:                selectedDD.ecno,
        ddName:                selectedDD.name,
        ddDesignation:         selectedDD.designation,
      });
      setSendResult({ success: true, message: res.message || "Sent for approval!" });
      setSelectedDraftIds(new Set());
      setSelectedApprover(null); setSelectedApprover2(null);
      setShowApprover2(false);
      setSelectedRegistrar(null); setSelectedDD(null);
      fetchDrafts();
    } catch (err) {
      setSendResult({ success: false, message: err.message || "Failed to send." });
    } finally {
      setSendingForApproval(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Send size={24} style={{ color: "#f59e0b" }} />
          Ready to Send Approval Request
        </h2>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem", color: "var(--text-muted)" }}>
          Select your saved draft systems below, choose your Approver, Area Focal Point and DD, then send for approval.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: "1.4rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f59e0b" }}>My Saved Drafts</span>
            {drafts.length > 0 && (
              <span style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", borderRadius: 20, padding: "1px 8px", fontSize: "0.72rem", fontWeight: 700 }}>
                {drafts.length}
              </span>
            )}
          </div>
          <button onClick={fetchDrafts} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "4px 12px", color: "var(--text-muted)", fontSize: "0.78rem", cursor: "pointer" }}>
            Refresh
          </button>
        </div>

        {draftsLoading && (
          <div style={{ color: "var(--text-muted)", fontSize: "0.88rem", padding: "1.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading drafts...
          </div>
        )}

        {!draftsLoading && drafts.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 2rem", color: "var(--text-muted)", fontSize: "0.9rem", border: "1.5px dashed rgba(255,255,255,0.1)", borderRadius: 10 }}>
            <Send size={36} style={{ marginBottom: "0.75rem", opacity: 0.3 }} />
            <div>No drafts found.</div>
            <div style={{ marginTop: "0.4rem", fontSize: "0.82rem" }}>
              Go to <strong>Add System to ACMS List</strong>, fill the form and click <strong>Save as Draft</strong> to add systems here.
            </div>
          </div>
        )}

        {sendResult && (
          <div style={{
            padding: "0.7rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.85rem", fontWeight: 600,
            background: sendResult.success ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: sendResult.success ? "#22c55e" : "#ef4444",
            border: "1px solid " + (sendResult.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"),
          }}>
            {sendResult.success ? "Sent: " : "Error: "}{sendResult.message}
          </div>
        )}

        {!draftsLoading && drafts.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <input
                type="checkbox"
                checked={selectedDraftIds.size === drafts.length && drafts.length > 0}
                onChange={e => setSelectedDraftIds(e.target.checked ? new Set(drafts.map(d => d.id)) : new Set())}
                style={{ accentColor: "#f59e0b", width: 16, height: 16, cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Select All ({drafts.length})</span>
              {selectedDraftIds.size > 0 && (
                <span style={{ fontSize: "0.8rem", color: "#f59e0b", fontWeight: 600 }}>{selectedDraftIds.size} selected</span>
              )}
            </div>

            {drafts.map(d => (
              <div
                key={d.id}
                onClick={() => toggleDraft(d.id)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "0.75rem",
                  background: selectedDraftIds.has(d.id) ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
                  border: "1.5px solid " + (selectedDraftIds.has(d.id) ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.1)"),
                  borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "0.6rem", cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedDraftIds.has(d.id)}
                  onChange={() => toggleDraft(d.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ accentColor: "#f59e0b", width: 16, height: 16, cursor: "pointer", marginTop: 3, flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", marginBottom: "0.25rem" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.9rem", color: "#e2e8f0" }}>
                      {d.assetNumber || d.serialNumber || ("Draft #" + d.id)}
                    </span>
                    {d.serialNumber && d.assetNumber && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>SN: {d.serialNumber}</span>
                    )}
                    <span style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 20, padding: "1px 7px", fontSize: "0.65rem", fontWeight: 700 }}>
                      Draft
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {d.category     && <span>Category: {d.category}</span>}
                    {d.make         && <span>Make: {d.make} {d.model || ""}</span>}
                    {d.area         && <span>Area: {d.area}</span>}
                    {d.userDivision && <span>Division: {d.userDivision}</span>}
                    {d.createdAt    && <span>Date: {new Date(d.createdAt).toLocaleDateString("en-IN")}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedDraftIds.size > 0 && (
          <div style={{ marginTop: "1.2rem", padding: "1.2rem", background: "rgba(108,99,255,0.06)", border: "1.5px solid rgba(108,99,255,0.2)", borderRadius: 12 }}>
            <h4 style={{ margin: "0 0 1rem", color: "#a5b4fc", fontSize: "0.95rem", fontWeight: 700 }}>
              Select Approvers for {selectedDraftIds.size} request(s)
            </h4>
            {dropdownsLoading && (
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading personnel...
              </div>
            )}
            {!dropdownsLoading && (
              <div>
                {/* Approver 1 row with + button */}
                <div style={{ position: 'relative', marginBottom: '0.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.28rem' }}>
                    <label style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
                      Approver
                    </label>
                    {!showApprover2 ? (
                      <button
                        type="button"
                        onClick={() => setShowApprover2(true)}
                        title="Add a 2nd Approver"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                          background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.4)',
                          borderRadius: 6, padding: '2px 9px', cursor: 'pointer',
                          color: '#a5b4fc', fontSize: '0.7rem', fontWeight: 700,
                        }}
                      >
                        <Plus size={11} /> Add 2nd Approver
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setShowApprover2(false); setSelectedApprover2(null); }}
                        title="Remove 2nd Approver"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 6, padding: '2px 9px', cursor: 'pointer',
                          color: '#fca5a5', fontSize: '0.7rem', fontWeight: 700,
                        }}
                      >
                        <X size={11} /> Remove 2nd Approver
                      </button>
                    )}
                  </div>
                  <SearchablePersonSelect
                    label=""
                    list={approversList}
                    selected={selectedApprover}
                    setter={setSelectedApprover}
                  />
                </div>

                {/* 2nd Approver (optional) */}
                {showApprover2 && (
                  <div style={{
                    marginBottom: '0.75rem',
                    paddingLeft: '0.75rem',
                    borderLeft: '2px solid rgba(108,99,255,0.35)',
                  }}>
                    <label style={{ display: 'block', fontSize: '0.73rem', color: '#a5b4fc', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '0.28rem' }}>
                      2nd Approver <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span>
                    </label>
                    <SearchablePersonSelect
                      label=""
                      list={approversList}
                      selected={selectedApprover2}
                      setter={setSelectedApprover2}
                    />
                  </div>
                )}

                {/* Area Focal Point and DD */}
                <SearchablePersonSelect label="Area Focal Point"     list={registrarsList} selected={selectedRegistrar} setter={setSelectedRegistrar} />
                <SearchablePersonSelect label="Deputy Director (DD)" list={ddsList}        selected={selectedDD}        setter={setSelectedDD}        />
              </div>
            )}
            <button
              onClick={handleSendForApproval}
              disabled={sendingForApproval || !selectedApprover || !selectedRegistrar || !selectedDD}
              style={{
                width: "100%", padding: "0.75rem",
                background: (!selectedApprover || !selectedRegistrar || !selectedDD) ? "rgba(108,99,255,0.3)" : "linear-gradient(135deg, #6c63ff, #a855f7)",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: "0.95rem", fontWeight: 700, cursor: sendingForApproval ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                opacity: sendingForApproval ? 0.7 : 1, marginTop: "0.5rem", transition: "all 0.2s",
              }}
            >
              {sendingForApproval
                ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Sending...</>
                : <><Send size={16} /> Send {selectedDraftIds.size} Request(s) for Approval</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
