import React, { useState, useEffect } from "react";
import {
  ShieldCheck, CheckCircle2, XCircle, Loader2, AlertCircle,
  ChevronDown, ChevronUp, Pencil, Save, X, RotateCcw
} from "lucide-react";
import { getAssignedApprovals, approveOrRejectRequest, editPendingRequest } from "../api";
import "../pages/Dashboard.css";

const STATUS_COLORS = {
  "Submitted":          "#f59e0b",
  "Approver Approved":  "#60a5fa",
  "Registrar Approved": "#a78bfa",
  "DD Approved":        "#34d399",
};

// Maps internal DB status strings to user-facing labels
const STATUS_LABELS = {
  "Submitted":          "Submitted",
  "Approver Approved":  "Approver Approved",
  "Registrar Approved": "Area Focal Point Approved",
  "DD Approved":        "DD Approved",
  "Approved":           "Fully Approved",
  "Rejected":           "Rejected",
};

// ─── small styled input ────────────────────────────────────────────────────
function FInput({ label, value, onChange, type = "text", fullWidth = false, readOnly = false }) {
  return (
    <div style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <label style={{
        display: "block", fontSize: "0.68rem", color: "#64748b",
        marginBottom: "0.2rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
      }}>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        style={{
          width: "100%", padding: "0.42rem 0.6rem", boxSizing: "border-box",
          background: readOnly ? "#f1f5f9" : "#ffffff",
          border: "1.5px solid #cbd5e1",
          borderRadius: 7, color: readOnly ? "#64748b" : "#1e293b",
          fontSize: "0.8rem", outline: "none", transition: "border-color 0.2s",
        }}
        onFocus={e => !readOnly && (e.target.style.borderColor = "#6c63ff")}
        onBlur={e  => (e.target.style.borderColor = "#cbd5e1")}
      />
    </div>
  );
}

function FSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: "0.68rem", color: "#64748b",
        marginBottom: "0.2rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
      }}>{label}</label>
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", padding: "0.42rem 0.6rem", boxSizing: "border-box",
          background: "#ffffff", border: "1.5px solid #cbd5e1",
          borderRadius: 7, color: "#1e293b", fontSize: "0.8rem", outline: "none",
          cursor: "pointer",
        }}
      >
        <option value="">-- Select --</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FTextarea({ label, value, onChange }) {
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <label style={{
        display: "block", fontSize: "0.68rem", color: "#64748b",
        marginBottom: "0.2rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
      }}>{label}</label>
      <textarea
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        rows={3}
        style={{
          width: "100%", padding: "0.42rem 0.6rem", boxSizing: "border-box",
          background: "#ffffff", border: "1.5px solid #cbd5e1",
          borderRadius: 7, color: "#1e293b", fontSize: "0.8rem", outline: "none",
          resize: "vertical", fontFamily: "inherit",
        }}
      />
    </div>
  );
}

// ─── Edit form ─────────────────────────────────────────────────────────────
function EditForm({ req, onSave, onCancel }) {
  const [form, setForm] = useState({
    assetNumber:       req.assetNumber       || "",
    serialNumber:      req.serialNumber      || "",
    category:          req.category          || "",
    make:              req.make              || "",
    model:             req.model             || "",
    networkDomain:     req.networkDomain     || "",
    ipAddress:         req.ipAddress         || "",
    monitor:           req.monitor           || "",
    assetCustodianEcno:req.assetCustodianEcno|| "",
    userDivision:      req.userDivision      || "",
    group:             req.group             || "",
    area:              req.area              || "",
    location:          req.location          || "",
    acmsFms:           req.acmsFms           || "",
    warranty:          req.warranty          || "No",
    fmsExpiryDate:     req.fmsExpiryDate     || "",
    configuration:     req.configuration     || "",
  });
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState(null);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      const result = await editPendingRequest(req.id, form);
      onSave(result.request);
    } catch (err) {
      setSaveErr(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      background: "#f8fafc", border: "1.5px solid #e2e8f0",
      borderRadius: 12, padding: "1rem 1.1rem", marginTop: "0.75rem",
    }}>
      {/* Edit header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Pencil size={14} style={{ color: "#6c63ff" }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4f46e5" }}>
            Editing Asset Details
          </span>
        </div>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Two-column grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "0.6rem", marginBottom: "0.75rem",
      }}>
        <FInput label="Asset Number"        value={form.assetNumber}        onChange={set("assetNumber")} />
        <FInput label="Serial Number"       value={form.serialNumber}       onChange={set("serialNumber")} />
        <FInput label="Category"            value={form.category}           onChange={set("category")} />
        <FInput label="Make"                value={form.make}               onChange={set("make")} />
        <FInput label="Model"               value={form.model}              onChange={set("model")} />
        <FInput label="Network Domain"      value={form.networkDomain}      onChange={set("networkDomain")} />
        <FInput label="IP Address"          value={form.ipAddress}          onChange={set("ipAddress")} />
        <FInput label="Monitor"             value={form.monitor}            onChange={set("monitor")} />
        <FInput label="Division"            value={form.userDivision}       onChange={set("userDivision")} />
        <FInput label="Group"               value={form.group}              onChange={set("group")} />
        <FInput label="Area"                value={form.area}               onChange={set("area")} />
        <FInput label="Location"            value={form.location}           onChange={set("location")} />
        <FInput label="Asset Custodian ECNO" value={form.assetCustodianEcno} onChange={set("assetCustodianEcno")} />
        <FSelect
          label="ACMS / FMS"
          value={form.acmsFms}
          onChange={set("acmsFms")}
          options={["ACMS", "FMS", "ACMS+FMS"]}
        />
        <FSelect
          label="Warranty"
          value={form.warranty}
          onChange={set("warranty")}
          options={["Yes", "No"]}
        />
        {form.warranty === "Yes" && (
          <FInput
            label="Warranty Expiry Date"
            value={form.fmsExpiryDate}
            onChange={set("fmsExpiryDate")}
            type="date"
          />
        )}
        <FTextarea label="Configuration / Brief Config" value={form.configuration} onChange={set("configuration")} />
      </div>

      {/* Error */}
      {saveErr && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 7, padding: "0.5rem 0.75rem", marginBottom: "0.65rem",
          fontSize: "0.78rem", color: "#fca5a5", display: "flex", gap: "0.4rem", alignItems: "center",
        }}>
          <AlertCircle size={13} /> {saveErr}
        </div>
      )}

      {/* Save / Cancel buttons */}
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            flex: 1, padding: "0.55rem", borderRadius: 8, cursor: "pointer",
            background: "#f1f5f9", border: "1.5px solid #cbd5e1",
            color: "#64748b", fontSize: "0.82rem", fontWeight: 600,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2, padding: "0.55rem", borderRadius: 8,
            cursor: saving ? "wait" : "pointer",
            background: saving ? "rgba(108,99,255,0.35)" : "linear-gradient(135deg,#6c63ff,#4f46e5)",
            border: "none", color: "#fff", fontSize: "0.82rem", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            transition: "all 0.2s",
          }}
        >
          {saving
            ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            : <Save size={14} />
          }
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Main card ─────────────────────────────────────────────────────────────
function AssignedCard({ req: initialReq, myRole, onAction }) {
  const [req,      setReq]      = useState(initialReq);
  const [mode,     setMode]     = useState("view");   // "view" | "edit" | "done"
  const [expanded, setExpanded] = useState(false);
  const [remarks,  setRemarks]  = useState("");
  const [acting,   setActing]   = useState(false);    // "approve"|"reject"|false
  const [doneInfo, setDoneInfo] = useState(null);     // { success, message }
  const [savedMsg, setSavedMsg] = useState(null);     // brief "saved!" banner

  const handleAct = async (action) => {
    setActing(action);
    try {
      const res = await approveOrRejectRequest(req.id, action, remarks);
      setDoneInfo({ success: action === "approve", message: res.message || (action === "approve" ? "Approved" : "Rejected") + " successfully." });
      onAction();
    } catch (err) {
      setDoneInfo({ success: false, message: err.message || "Action failed." });
    } finally {
      setActing(false);
    }
  };

  const handleSaveEdit = (updatedReq) => {
    setReq(updatedReq);
    setMode("view");
    setSavedMsg("Changes saved — you can now approve or reject.");
    setTimeout(() => setSavedMsg(null), 5000);
  };

  const accentColor = STATUS_COLORS[req.status] || "#6c63ff";
  const isDeleteReq = req.requestType === "delete";

  // Done state
  if (doneInfo) {
    return (
      <div style={{
        padding: "0.9rem 1.2rem", borderRadius: 12, marginBottom: "0.9rem",
        background: doneInfo.success ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
        border: "1.5px solid " + (doneInfo.success ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"),
        display: "flex", alignItems: "center", gap: "0.6rem",
        fontSize: "0.88rem", fontWeight: 600,
        color: doneInfo.success ? "#22c55e" : "#ef4444",
      }}>
        {doneInfo.success ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        {doneInfo.message} —{" "}
        <span style={{ fontFamily: "monospace" }}>{req.assetNumber || req.serialNumber || ("#" + req.id)}</span>
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1.5px solid " + accentColor + "33",
      borderRadius: 14, padding: "1rem 1.2rem", marginBottom: "1rem",
    }}>
      {/* ── Top row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <div style={{ flex: 1 }}>
          {/* DELETE REQUEST badge */}
          {isDeleteReq && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.3rem",
              background: "rgba(239,68,68,0.15)", color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: 6, padding: "2px 8px", fontSize: "0.65rem", fontWeight: 800,
              marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              🗑️ Delete Request
            </div>
          )}
          <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.95rem", color: "#e2e8f0", marginBottom: "0.2rem" }}>
            {req.assetNumber || req.serialNumber || ("Request #" + req.id)}
            {req.serialNumber && req.assetNumber && (
              <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>· SN: {req.serialNumber}</span>
            )}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {req.category    && <span>📂 {req.category}</span>}
            {req.make        && <span>🏭 {req.make} {req.model || ""}</span>}
            {req.area        && <span>📍 {req.area}</span>}
            {req.userDivision && <span>🏢 {req.userDivision}</span>}
          </div>
          {req.configuration && (
            <div style={{
              marginTop: "0.4rem", marginBottom: "0.2rem",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6, padding: "0.4rem 0.6rem",
            }}>
              <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.15rem" }}>Configuration</span>
              <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "0.8rem", wordBreak: "break-word", lineHeight: 1.4 }}>{req.configuration}</span>
            </div>
          )}
          <div style={{ marginTop: "0.3rem", fontSize: "0.73rem", color: "var(--text-muted)" }}>
            Requested by:{" "}
            <strong style={{ color: "#e2e8f0" }}>
              {req.requesterEmployeeName || req.requesterName || req.requesterEcno}
            </strong>
            {req.requesterEcno && (
              <span style={{ marginLeft: "0.4rem", fontFamily: "monospace", color: "#a5b4fc", fontSize: "0.68rem" }}>
                ({req.requesterEcno})
              </span>
            )}
            {req.createdAt && <span style={{ marginLeft: "0.5rem" }}>· {new Date(req.createdAt).toLocaleDateString("en-IN")}</span>}
          </div>
          {/* Requester reason (delete requests) */}
          {req.requesterRemarks && (
            <div style={{
              marginTop: "0.5rem",
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 7, padding: "0.45rem 0.75rem",
              fontSize: "0.75rem", color: "#fca5a5",
            }}>
              <span style={{ fontWeight: 700, display: "block", marginBottom: "0.15rem", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Reason for deletion:
              </span>
              {req.requesterRemarks}
            </div>
          )}
        </div>
        {/* Status + role badges */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
          <span style={{
            background: accentColor + "20", color: accentColor, border: "1px solid " + accentColor + "44",
            borderRadius: 20, padding: "2px 10px", fontSize: "0.7rem", fontWeight: 700,
          }}>{STATUS_LABELS[req.status] || req.status}</span>
          <span style={{ fontSize: "0.72rem", color: "#a5b4fc", fontWeight: 600 }}>Awaiting: {myRole}</span>
        </div>
      </div>

      {/* ── Saved confirmation banner ── */}
      {savedMsg && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: 7, padding: "0.4rem 0.75rem", marginBottom: "0.6rem",
          fontSize: "0.78rem", color: "#22c55e", fontWeight: 600,
        }}>
          <CheckCircle2 size={14} /> {savedMsg}
        </div>
      )}

      {/* ── Toggle: view details / edit ── */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: mode === "edit" ? 0 : "0.5rem" }}>
        <button
          onClick={() => { setExpanded(v => !v); if (mode === "edit") setMode("view"); }}
          style={{
            background: "none", border: "none", color: "var(--accent-primary, #6c63ff)",
            fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4, padding: 0,
          }}
        >
          {expanded && mode !== "edit" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded && mode !== "edit" ? "Hide details" : "Show all details"}
        </button>

        {/* Edit button — only for add-type requests */}
        {!isDeleteReq && mode !== "edit" && (
          <button
            onClick={() => { setMode("edit"); setExpanded(false); }}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)",
              borderRadius: 7, padding: "3px 10px", fontSize: "0.74rem", fontWeight: 700,
              color: "#a5b4fc", cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(108,99,255,0.2)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(108,99,255,0.1)"}
          >
            <Pencil size={12} /> Edit Details
          </button>
        )}
        {mode === "edit" && (
          <button
            onClick={() => setMode("view")}
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 7, padding: "3px 10px", fontSize: "0.74rem",
              color: "var(--text-muted)", cursor: "pointer",
            }}
          >
            <RotateCcw size={12} /> Back to view
          </button>
        )}
      </div>

      {/* ── Expanded details view ── */}
      {expanded && mode !== "edit" && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: "0.5rem", padding: "0.85rem 1rem",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 8, marginBottom: "0.75rem",
        }}>
          {[
            ["Asset No",       req.assetNumber],    ["Serial No",    req.serialNumber],
            ["Category",       req.category],       ["Make",         req.make],
            ["Model",          req.model],          ["IP Address",   req.ipAddress],
            ["Network Domain", req.networkDomain],  ["Monitor",      req.monitor],
            ["Division",       req.userDivision],   ["Group",        req.group],
            ["Area",           req.area],           ["Location",     req.location],
            ["ACMS/FMS",       req.acmsFms],        ["Warranty",     req.warranty],
            ["Warranty Expiry",req.fmsExpiryDate],  ["Custodian ECNO",req.assetCustodianEcno],
          ].filter(([, v]) => v).map(([label, val]) => (
            <div key={label} style={{ fontSize: "0.73rem" }}>
              <span style={{ color: "#64748b", display: "block", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.1rem" }}>{label}</span>
              <span style={{ color: "#1e293b", fontWeight: 600, fontSize: "0.8rem" }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Inline edit form ── */}
      {mode === "edit" && (
        <EditForm
          req={req}
          onSave={handleSaveEdit}
          onCancel={() => setMode("view")}
        />
      )}

      {/* ── Remarks + action buttons (only in view mode) ── */}
      {mode !== "edit" && (
        <>
          <textarea
            placeholder="Remarks (optional)..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={2}
            style={{
              width: "100%", background: "#ffffff", border: "1.5px solid #cbd5e1",
              borderRadius: 8, color: "#1e293b", fontSize: "0.82rem", padding: "0.5rem 0.7rem",
              resize: "vertical", marginTop: "0.65rem", marginBottom: "0.75rem", boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => handleAct("approve")}
              disabled={!!acting}
              style={{
                flex: 1, padding: "0.6rem",
                background: "linear-gradient(135deg,#22c55e,#16a34a)",
                color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem",
                cursor: acting ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                opacity: acting === "approve" ? 0.7 : 1, transition: "opacity 0.2s",
              }}
            >
              {acting === "approve"
                ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                : <CheckCircle2 size={15} />
              }
              Approve
            </button>
            <button
              onClick={() => handleAct("reject")}
              disabled={!!acting}
              style={{
                flex: 1, padding: "0.6rem",
                background: "rgba(239,68,68,0.12)",
                color: "#ef4444", border: "1.5px solid rgba(239,68,68,0.35)", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem",
                cursor: acting ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                opacity: acting === "reject" ? 0.7 : 1, transition: "opacity 0.2s",
              }}
            >
              {acting === "reject"
                ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                : <XCircle size={15} />
              }
              Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── role label ────────────────────────────────────────────────────────────
function levelLabel(req, myEcno, isAdmin) {
  const e = (myEcno || "").trim().toUpperCase();
  if (req.status === "Submitted"          && (req.approverEcno  || "").trim().toUpperCase() === e) return "Approver";
  if (req.status === "Approver Approved"  && (req.registrarEcno || "").trim().toUpperCase() === e) return "Area Focal Point";
  if (req.status === "Registrar Approved" && (req.ddEcno        || "").trim().toUpperCase() === e) return "Deputy Director";
  if (req.status === "DD Approved"        && isAdmin)                                              return "Admin";
  return "Reviewer";
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function PendingApprovals({ loggedInUser }) {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const myEcno  = (loggedInUser?.emp_code || "").trim().toUpperCase();
  const isAdmin = (loggedInUser?.role     || "").toLowerCase() === "admin";

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getAssignedApprovals()
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(e   => setError(e.message || "Failed to load."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="add-asset-container animate-fade-in">
      <div className="section-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldCheck size={24} style={{ color: "#6c63ff" }} /> Pending For My Approval
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Requests waiting for your action. You can edit asset details before approving.
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{
            background: "rgba(108,99,255,0.12)", color: "var(--accent-primary,#6c63ff)",
            border: "1px solid rgba(108,99,255,0.3)", borderRadius: 8,
            padding: "6px 14px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", marginBottom: "0.75rem" }} />
          <div>Loading pending approvals…</div>
        </div>
      )}

      {!loading && error && (
        <div style={{
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 10, padding: "1rem 1.5rem", color: "#ef4444",
          display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div style={{
          textAlign: "center", padding: "4rem 2rem",
          background: "rgba(255,255,255,0.03)", borderRadius: 14,
          border: "1.5px dashed rgba(255,255,255,0.1)",
        }}>
          <ShieldCheck size={40} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
          <h3 style={{ color: "#e2e8f0", marginBottom: "0.5rem" }}>No Pending Approvals</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            No requests are currently assigned to you for approval.
          </p>
        </div>
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="glass-panel" style={{ padding: "1.2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#e2e8f0" }}>
              Awaiting Your Action
              <span style={{
                marginLeft: "0.5rem", background: "rgba(239,68,68,0.15)",
                color: "#ef4444", borderRadius: 20, padding: "1px 8px", fontSize: "0.75rem", fontWeight: 700,
              }}>{requests.length}</span>
            </h3>
          </div>
          {requests.map(req => (
            <AssignedCard
              key={req.id}
              req={req}
              myRole={levelLabel(req, myEcno, isAdmin)}
              onAction={fetchData}
            />
          ))}
        </div>
      )}
    </div>
  );
}
