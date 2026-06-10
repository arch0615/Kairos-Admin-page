import { useState, useEffect, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════════
   KAIROS · Users (INTERNAL/LOCAL tool)
   No login. Shows ALL users + their applications and documents.
   Data comes from /api/users (Vite server using the service key).
═══════════════════════════════════════════════════════════════ */

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');`;

const K = {
  navy:"#07111F", navyDeep:"#040A13", navyCard:"#0D1B2E",
  blue:"#1A56DB", blueLight:"#60A5FA", electric:"#0EA5E9", electricMid:"#38BDF8",
  white:"#EEF4FF", offWhite:"#CBD5E1", gray:"#64748B", grayMid:"#94A3B8",
  green:"#22C55E", red:"#EF4444", amber:"#F59E0B",
};

const STATUS = {
  enviada:   { label:"Submitted",    color:K.grayMid,  bg:"rgba(148,163,184,0.12)", bd:"rgba(148,163,184,0.3)" },
  revision:  { label:"Under review", color:K.blueLight,bg:"rgba(26,86,219,0.12)",  bd:"rgba(26,86,219,0.3)" },
  aprobada:  { label:"Approved",     color:K.green,    bg:"rgba(34,197,94,0.12)",  bd:"rgba(34,197,94,0.3)" },
  rechazada: { label:"Rejected",     color:K.red,      bg:"rgba(239,68,68,0.1)",   bd:"rgba(239,68,68,0.28)" },
};
const ROLE = {
  director: { label:"Director", color:K.electric,  bg:"rgba(14,165,233,0.12)", bd:"rgba(14,165,233,0.3)" },
  analista: { label:"Analyst",  color:K.blueLight, bg:"rgba(26,86,219,0.12)",  bd:"rgba(26,86,219,0.3)" },
  cliente:  { label:"Client",   color:K.grayMid,   bg:"rgba(148,163,184,0.1)", bd:"rgba(148,163,184,0.25)" },
  "—":      { label:"no profile", color:K.gray,    bg:"rgba(100,116,139,0.1)", bd:"rgba(100,116,139,0.2)" },
};

const ROLE_FILTERS = [
  { key:"all", label:"All" },
  { key:"cliente", label:"Client" },
  { key:"analista", label:"Analyst" },
  { key:"director", label:"Director" },
  { key:"—", label:"No profile" },
];

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const mxn = n => n==null ? "—" : new Intl.NumberFormat("en-US",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n);
const fdate = s => { if(!s) return "—"; const d=new Date(s); return d.toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"})+" "+d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}); };
const fday = s => { if(!s) return "—"; return new Date(s).toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"}); };

const CSS = `
${FONTS}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Barlow',sans-serif;background:${K.navyDeep};color:${K.white};-webkit-font-smoothing:antialiased;}
.u{min-height:100vh;background:radial-gradient(ellipse 120% 50% at 90% -10%, rgba(26,86,219,0.13) 0%,transparent 55%),linear-gradient(170deg,${K.navyDeep},${K.navy} 70%);}
.u-top{position:sticky;top:0;z-index:20;background:rgba(4,10,19,0.92);backdrop-filter:blur(16px);border-bottom:1px solid rgba(26,86,219,0.2);padding:14px 22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;}
.u-title{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;background:linear-gradient(90deg,${K.white},${K.electricMid});-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.u-badge-int{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${K.amber};background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);padding:3px 8px;border-radius:5px;margin-left:10px;}
.u-search{background:rgba(4,10,19,0.7);border:1.5px solid rgba(22,36,64,0.9);border-radius:9px;padding:10px 14px;color:${K.white};font-family:'Barlow',sans-serif;font-size:14px;outline:none;min-width:240px;}
.u-search:focus{border-color:${K.blue};}
.u-main{max-width:1080px;margin:0 auto;padding:22px;}
.u-summary{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;}
.u-stat{background:rgba(13,27,46,0.7);border:1px solid rgba(26,86,219,0.16);border-radius:12px;padding:14px 18px;min-width:120px;}
.u-stat-n{font-family:'Bebas Neue',sans-serif;font-size:28px;color:${K.electricMid};line-height:1;}
.u-stat-l{font-size:11px;color:${K.grayMid};margin-top:5px;text-transform:uppercase;letter-spacing:.5px;}
.u-card{background:rgba(13,27,46,0.7);border:1px solid rgba(26,86,219,0.16);border-radius:14px;margin-bottom:14px;overflow:hidden;}
.u-card-head{display:flex;align-items:center;gap:14px;padding:16px 18px;cursor:pointer;transition:background .12s;flex-wrap:wrap;}
.u-card-head:hover{background:rgba(26,86,219,0.05);}
.u-avatar{width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,${K.blue},${K.electric});display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:20px;color:#fff;flex-shrink:0;}
.u-id{flex:1;min-width:180px;}
.u-email{font-size:14.5px;font-weight:700;color:${K.white};}
.u-name{font-size:12.5px;color:${K.grayMid};}
.u-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;}
.u-meta{display:flex;gap:18px;flex-wrap:wrap;font-size:11.5px;color:${K.gray};}
.u-meta b{color:${K.offWhite};font-weight:600;}
.u-count{font-size:12px;color:${K.blueLight};font-weight:700;}
.u-chev{color:${K.gray};font-size:14px;transition:transform .2s;}
.u-chev.open{transform:rotate(90deg);}
.u-body{border-top:1px solid rgba(22,36,64,0.6);padding:6px 18px 16px;}
.u-sol{background:rgba(4,10,19,0.45);border:1px solid rgba(22,36,64,0.8);border-radius:10px;padding:14px;margin-top:12px;}
.u-sol-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;}
.u-folio{font-family:'JetBrains Mono',monospace;color:${K.blueLight};font-weight:500;font-size:14px;}
.u-kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px 16px;font-size:12.5px;}
.u-kv dt{color:${K.gray};font-size:10px;text-transform:uppercase;letter-spacing:.5px;}
.u-kv dd{color:${K.white};}
.u-docs{margin-top:12px;display:flex;flex-direction:column;gap:7px;}
.u-doc{display:flex;align-items:center;justify-content:space-between;gap:10px;background:rgba(4,10,19,0.5);border:1px solid rgba(22,36,64,0.8);border-radius:8px;padding:8px 11px;}
.u-doc-t{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${K.blueLight};}
.u-doc-n{font-size:12px;color:${K.offWhite};word-break:break-all;}
.u-btn{font-family:'Barlow',sans-serif;border:1px solid rgba(26,86,219,0.3);background:rgba(22,36,64,0.7);color:${K.grayMid};border-radius:7px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;}
.u-btn:hover{color:${K.white};background:rgba(22,36,64,1);}
.u-empty,.u-loading{padding:60px 20px;text-align:center;color:${K.gray};}
.u-spin{display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,0.25);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite;vertical-align:middle;}
@keyframes sp{to{transform:rotate(360deg)}}
.u-err{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.28);color:${K.red};border-radius:10px;padding:16px;font-size:13px;}
.u-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.u-chip{padding:7px 13px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid transparent;background:rgba(22,36,64,0.6);color:${K.grayMid};transition:all .15s;}
.u-chip.on{background:rgba(26,86,219,0.16);border-color:rgba(26,86,219,0.4);color:${K.blueLight};}
.u-toolbar-sp{flex:1;}
.u-selall{display:flex;align-items:center;gap:7px;font-size:12px;color:${K.grayMid};cursor:pointer;white-space:nowrap;}
.u-check{width:18px;height:18px;flex-shrink:0;cursor:pointer;accent-color:${K.blue};}
.u-selbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:rgba(26,86,219,0.08);border:1px solid rgba(26,86,219,0.22);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:${K.blueLight};}
.u-selbar b{color:#fff;}
.u-pager{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:18px;padding:10px;font-size:12.5px;color:${K.grayMid};}
.u-pager button{font-family:'Barlow',sans-serif;background:rgba(22,36,64,0.7);border:1px solid rgba(26,86,219,0.3);color:${K.offWhite};border-radius:8px;padding:8px 14px;font-size:12.5px;font-weight:700;cursor:pointer;}
.u-pager button:disabled{opacity:.35;cursor:not-allowed;}
.u-pager select{background:rgba(4,10,19,0.7);border:1.5px solid rgba(22,36,64,0.9);border-radius:8px;color:${K.white};font-family:'Barlow',sans-serif;font-size:12.5px;padding:7px 10px;outline:none;}
.u-back{background:rgba(22,36,64,0.7);border:1px solid rgba(26,86,219,0.3);color:${K.offWhite};border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Barlow',sans-serif;margin-bottom:18px;}
.u-back:hover{color:#fff;background:rgba(22,36,64,1);}
.u-detail-head{display:flex;align-items:center;gap:16px;margin-bottom:18px;}
.u-avatar-lg{width:64px;height:64px;border-radius:14px;font-size:30px;}
.u-detail-email{font-size:20px;font-weight:700;color:#fff;word-break:break-all;}
.u-detail-lbl{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${K.electric};margin-bottom:12px;}
.kfade{animation:kf .25s ease;}
@keyframes kf{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:rgba(26,86,219,0.3);border-radius:8px}
`;

function Pill({ map, k }) {
  const s = map[k] || { label:k, color:K.gray, bg:"rgba(100,116,139,0.1)", bd:"rgba(100,116,139,0.2)" };
  return <span className="u-pill" style={{background:s.bg,border:`1px solid ${s.bd}`,color:s.color}}>{s.label}</span>;
}

function Solicitud({ s, onDoc }) {
  return (
    <div className="u-sol">
      <div className="u-sol-head">
        <span className="u-folio">{s.folio}</span>
        <Pill map={STATUS} k={s.status} />
      </div>
      <dl className="u-kv">
        <div><dt>Name</dt><dd>{s.nombre || "—"}</dd></div>
        <div><dt>Phone</dt><dd>{s.telefono || "—"}</dd></div>
        <div><dt>RFC</dt><dd>{s.rfc || "—"}</dd></div>
        <div><dt>CURP</dt><dd>{s.curp || "—"}</dd></div>
        <div><dt>Amount</dt><dd>{mxn(s.monto)}</dd></div>
        <div><dt>Term</dt><dd>{s.plazo!=null?`${s.plazo} months`:"—"}</dd></div>
        <div><dt>Income</dt><dd>{mxn(s.ingreso)}</dd></div>
        <div><dt>Employment</dt><dd>{s.tipo_empleo || "—"}</dd></div>
        <div><dt>Address</dt><dd>{[s.calle,s.colonia,s.municipio,s.estado_rep,s.cp].filter(Boolean).join(", ") || "—"}</dd></div>
        <div><dt>Created</dt><dd>{fday(s.created_at)}</dd></div>
      </dl>
      {s.documentos.length > 0 && (
        <div className="u-docs">
          {s.documentos.map(d => (
            <div className="u-doc" key={d.id}>
              <div>
                <div className="u-doc-t">{d.tipo}</div>
                <div className="u-doc-n">{d.nombre_archivo || d.storage_path.split("/").pop()}</div>
              </div>
              <button className="u-btn" onClick={() => onDoc(d.storage_path)}>⬇ View</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserCard({ u, onOpen, selected, onToggleSelect }) {
  const initial = (u.email || "?").charAt(0).toUpperCase();
  return (
    <div className="u-card">
      <div className="u-card-head" onClick={() => onOpen(u.id)}>
        <input type="checkbox" className="u-check" checked={selected}
          onClick={e => e.stopPropagation()} onChange={() => onToggleSelect(u.id)} title="Select" />
        <div className="u-avatar">{initial}</div>
        <div className="u-id">
          <div className="u-email">{u.email}</div>
          {u.nombre && <div className="u-name">{u.nombre}</div>}
        </div>
        <Pill map={ROLE} k={u.role} />
        <div className="u-meta">
          <span>Created: <b>{fday(u.created_at)}</b></span>
          <span>Last login: <b>{u.last_sign_in_at ? fdate(u.last_sign_in_at) : "never"}</b></span>
          <span>Email: <b>{u.email_confirmed_at ? "confirmed" : "unconfirmed"}</b></span>
        </div>
        <span className="u-count">{u.solicitudes.length} application{u.solicitudes.length===1?"":"s"}</span>
        <span className="u-chev">→</span>
      </div>
    </div>
  );
}

// ── User detail page ──
function UserDetail({ u, onBack, onDoc }) {
  const initial = (u.email || "?").charAt(0).toUpperCase();
  const mono = { fontFamily: "'JetBrains Mono',monospace" };
  return (
    <div className="kfade">
      <button className="u-back" onClick={onBack}>← Back to list</button>

      <div className="u-detail-head">
        <div className="u-avatar u-avatar-lg">{initial}</div>
        <div>
          <div className="u-detail-email">{u.email}</div>
          {u.nombre && <div className="u-name" style={{fontSize:14}}>{u.nombre}</div>}
          <div style={{marginTop:8}}><Pill map={ROLE} k={u.role} /></div>
        </div>
      </div>

      <div className="u-card" style={{padding:18}}>
        <div className="u-detail-lbl">Account</div>
        <dl className="u-kv">
          <div><dt>ID</dt><dd style={mono}>{u.id}</dd></div>
          <div><dt>Email</dt><dd>{u.email}</dd></div>
          <div><dt>Phone</dt><dd>{u.phone || "—"}</dd></div>
          <div><dt>Role</dt><dd>{ROLE[u.role]?.label || u.role}</dd></div>
          <div><dt>Created</dt><dd>{fdate(u.created_at)}</dd></div>
          <div><dt>Last login</dt><dd>{u.last_sign_in_at ? fdate(u.last_sign_in_at) : "never"}</dd></div>
          <div><dt>Email confirmed</dt><dd>{u.email_confirmed_at ? fdate(u.email_confirmed_at) : "no"}</dd></div>
        </dl>
      </div>

      <div className="u-detail-lbl" style={{margin:"20px 0 4px"}}>Applications ({u.solicitudes.length})</div>
      {u.solicitudes.length === 0
        ? <div className="u-empty" style={{padding:"30px 0"}}>This user has no applications.</div>
        : u.solicitudes.map(s => <Solicitud key={s.id} s={s} onDoc={onDoc} />)}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(() => new Set());
  const [view, setView] = useState(null); // null = list, or the user id in detail (synced with the hash)

  const openUser = (id) => { window.location.hash = `#u/${encodeURIComponent(id)}`; };
  const backToList = () => { window.location.hash = ""; };

  // Detail navigable via hash (#u/<id>): supports reload and the browser Back button.
  useEffect(() => {
    const apply = () => {
      const m = window.location.hash.match(/^#u\/(.+)$/);
      setView(m ? decodeURIComponent(m[1]) : null);
      window.scrollTo({ top: 0 });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    fetch("/api/users")
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Error"); return j; })
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openDoc = async (path) => {
    try {
      const r = await fetch(`/api/doc-url?path=${encodeURIComponent(path)}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      window.open(j.url, "_blank", "noopener");
    } catch (e) { alert("Could not open the document: " + e.message); }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.users.filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!s) return true;
      return (u.email||"").toLowerCase().includes(s) ||
        (u.nombre||"").toLowerCase().includes(s) ||
        (u.role||"").toLowerCase().includes(s) ||
        u.solicitudes.some(x => (x.folio||"").toLowerCase().includes(s));
    });
  }, [data, q, roleFilter]);

  // Count per role (for the filter chips)
  const roleCounts = useMemo(() => {
    const c = { todas: data?.users.length || 0 };
    (data?.users || []).forEach(u => { c[u.role] = (c[u.role] || 0) + 1; });
    return c;
  }, [data]);

  // When filter/search/size changes, go back to page 1.
  useEffect(() => { setPage(1); }, [q, roleFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  // ── Selection (checkboxes) ──
  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allFilteredSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id));
  const toggleSelectAllFiltered = () => setSelected(prev => {
    const n = new Set(prev);
    if (allFilteredSelected) filtered.forEach(u => n.delete(u.id));
    else filtered.forEach(u => n.add(u.id));
    return n;
  });
  const clearSelection = () => setSelected(new Set());
  const exportSelected = () => {
    const chosen = (data?.users || []).filter(u => selected.has(u.id));
    downloadCSV(chosen.map(u => ({
      email: u.email,
      name: u.nombre || "",
      role: u.role,
      created: u.created_at || "",
      last_login: u.last_sign_in_at || "",
      email_confirmed: u.email_confirmed_at ? "yes" : "no",
      num_applications: u.solicitudes.length,
      folios: u.solicitudes.map(s => s.folio).join(" | "),
    })), `kairos-users-${chosen.length}.csv`);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="u">
        <header className="u-top">
          <div>
            <span className="u-title">KAIROS · USERS</span>
            <span className="u-badge-int">Internal · Local</span>
          </div>
          {!view && <input className="u-search" placeholder="Search by email, name, role or folio…" value={q} onChange={e=>setQ(e.target.value)} />}
        </header>

        <main className="u-main">
          {loading ? (
            <div className="u-loading"><span className="u-spin"/> Loading users…</div>
          ) : err ? (
            <div className="u-err">⚠ {err}</div>
          ) : view ? (
            (() => {
              const detailUser = data.users.find(u => u.id === view);
              return detailUser
                ? <UserDetail u={detailUser} onBack={backToList} onDoc={openDoc} />
                : <div className="u-empty">User not found. <button className="u-btn" onClick={backToList}>Back</button></div>;
            })()
          ) : (
            <>
              <div className="u-summary">
                <div className="u-stat"><div className="u-stat-n">{data.summary.total}</div><div className="u-stat-l">Users</div></div>
                <div className="u-stat"><div className="u-stat-n">{data.summary.totalApplications}</div><div className="u-stat-l">Applications</div></div>
              </div>

              {/* User-type filter + select all */}
              <div className="u-toolbar">
                {ROLE_FILTERS.map(r => (
                  <button key={r.key} className={`u-chip${roleFilter===r.key?" on":""}`} onClick={()=>setRoleFilter(r.key)}>
                    {r.label} ({roleCounts[r.key] || 0})
                  </button>
                ))}
                <span className="u-toolbar-sp" />
                <label className="u-selall">
                  <input type="checkbox" className="u-check" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
                  Select all{(roleFilter!=="all"||q.trim()) ? " (filtered)" : ""}
                </label>
              </div>

              {/* Selection bar */}
              {selected.size > 0 && (
                <div className="u-selbar">
                  <b>{selected.size}</b> user(s) selected
                  <span className="u-toolbar-sp" />
                  <button className="u-btn" onClick={exportSelected}>⬇ Export CSV</button>
                  <button className="u-btn" onClick={clearSelection}>Clear</button>
                </div>
              )}

              {filtered.length === 0
                ? <div className="u-empty">No matching users.</div>
                : pageItems.map(u => (
                    <UserCard key={u.id} u={u} onOpen={openUser}
                      selected={selected.has(u.id)} onToggleSelect={toggleSelect} />
                  ))}

              {filtered.length > 0 && (
                <div className="u-pager">
                  <span>Showing {start+1}–{Math.min(start+pageSize, filtered.length)} of {filtered.length}</span>
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage<=1}>← Previous</button>
                  <span>Page {safePage} of {totalPages}</span>
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage>=totalPages}>Next →</button>
                  <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>
                    {[10,25,50,100].map(n => <option key={n} value={n}>{n} / page</option>)}
                  </select>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
