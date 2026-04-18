const { useEffect, useMemo, useRef, useState, useCallback } = React;

const STATUS_OPTIONS = [
  { value: "no_contactado", label: "No contactado", color: "#94a3b8" },
  { value: "contactado",    label: "Contactado",    color: "#3b82f6" },
  { value: "interesado",    label: "Interesado",    color: "#f59e0b" },
  { value: "cliente",       label: "Cliente",       color: "#10b981" },
  { value: "descartado",    label: "Descartado",    color: "#ef4444" },
];
const STATUS_BY_VALUE = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s]));

const DEFAULT_CENTER = [-34.6900, -58.3500];
const DEFAULT_ZOOM = 13;
const STORAGE_KEY = "demo_prospect_state_v1";

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function mergeWithState(prospects, state) {
  return prospects.map((p) => {
    const s = state[p.place_id] || {};
    return {
      ...p,
      status: s.status || "no_contactado",
      notes: s.notes || "",
      updated_at: s.updated_at || null,
    };
  });
}

function computeStats(prospects) {
  const total = prospects.length;
  const by_status = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, 0]));
  for (const p of prospects) {
    by_status[p.status] = (by_status[p.status] || 0) + 1;
  }
  const contacted = total - by_status.no_contactado;
  return {
    total,
    by_status,
    pct_contacted: total ? Math.round((contacted / total) * 1000) / 10 : 0,
    pct_clients: total ? Math.round((by_status.cliente / total) * 1000) / 10 : 0,
  };
}

function App() {
  const [rawProspects, setRawProspects] = useState(null);
  const [state, setState] = useState(loadState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterZone, setFilterZone] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchText, setSearchText] = useState("");

  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetch("data.json")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar data.json");
        return r.json();
      })
      .then((d) => setRawProspects(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const prospects = useMemo(
    () => (rawProspects ? mergeWithState(rawProspects, state) : []),
    [rawProspects, state]
  );

  const filters = useMemo(() => {
    const zones = new Set();
    const types = new Set();
    for (const p of prospects) {
      p.zones.forEach((z) => zones.add(z));
      if (p.type) types.add(p.type);
    }
    return { zones: [...zones].sort(), types: [...types].sort() };
  }, [prospects]);

  const stats = useMemo(() => computeStats(prospects), [prospects]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return prospects.filter((p) => {
      if (filterZone && !p.zones.includes(filterZone)) return false;
      if (filterType && p.type !== filterType) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.address.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [prospects, filterZone, filterType, filterStatus, searchText]);

  const selected = useMemo(
    () => filtered.find((p) => p.place_id === selectedId) || null,
    [filtered, selectedId]
  );

  const updateProspect = useCallback((placeId, payload) => {
    setState((prev) => {
      const curr = prev[placeId] || { status: "no_contactado", notes: "" };
      const next = {
        ...prev,
        [placeId]: {
          ...curr,
          ...payload,
          updated_at: new Date().toISOString(),
        },
      };
      saveState(next);
      return next;
    });
  }, []);

  const resetDemo = useCallback(() => {
    if (!confirm("¿Reiniciar la demo? Se perderán estados y notas guardadas.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setState({});
  }, []);

  if (loading) return <div className="full-center">Cargando 500 prospectos...</div>;
  if (error) return <div className="full-center error">Error: {error}</div>;

  return (
    <div className="app">
      <div className="demo-banner">
        MODO DEMO · 500 negocios ficticios · los cambios se guardan solo en este navegador
      </div>
      <Header stats={stats} onReset={resetDemo} />
      <div className="layout">
        <Sidebar
          filters={filters}
          filterZone={filterZone} setFilterZone={setFilterZone}
          filterType={filterType} setFilterType={setFilterType}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          searchText={searchText} setSearchText={setSearchText}
          shownCount={filtered.length} totalCount={prospects.length}
        />
        <main className="main">
          <div className="map-wrap">
            <MapView
              prospects={filtered}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
            />
          </div>
          <ProspectList
            items={filtered}
            selectedId={selectedId}
            onSelect={(p) => setSelectedId(p.place_id)}
          />
        </main>
        <DetailPanel
          prospect={selected}
          onUpdate={updateProspect}
          onClose={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}

function Header({ stats, onReset }) {
  return (
    <header className="topbar">
      <h1>📍 Búsqueda de Clientes</h1>
      <div className="stats">
        <Stat label="Total" value={stats.total} />
        <Stat label="Contactados" value={`${stats.pct_contacted}%`} />
        <Stat label="Clientes" value={`${stats.pct_clients}%`} />
        {STATUS_OPTIONS.map((s) => (
          <Stat key={s.value} label={s.label} value={stats.by_status[s.value] || 0} color={s.color} />
        ))}
      </div>
      <button className="reset-btn" onClick={onReset}>Reiniciar demo</button>
    </header>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="stat">
      {color && <span className="dot" style={{ background: color }} />}
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function Sidebar({
  filters,
  filterZone, setFilterZone,
  filterType, setFilterType,
  filterStatus, setFilterStatus,
  searchText, setSearchText,
  shownCount, totalCount,
}) {
  return (
    <aside className="sidebar">
      <h2>Filtros</h2>

      <label>
        Buscar por nombre / dirección
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="ej: panaderia"
        />
      </label>

      <label>
        Zona
        <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
          <option value="">Todas</option>
          {filters.zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </label>

      <label>
        Rubro
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos</option>
          {filters.types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <label>
        Estado
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>

      <div className="result-count">
        Mostrando <strong>{shownCount}</strong> de {totalCount}
      </div>

      <div className="legend">
        <h3>Leyenda</h3>
        {STATUS_OPTIONS.map((s) => (
          <div key={s.value} className="legend-item">
            <span className="dot" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </aside>
  );
}

function MapView({ prospects, selectedId, onSelect }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef(new Map());

  useEffect(() => {
    if (mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapInstance.current = map;
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const nextIds = new Set(prospects.map((p) => p.place_id));
    // remove markers no longer present
    for (const [id, m] of markersRef.current) {
      if (!nextIds.has(id)) {
        map.removeLayer(m);
        markersRef.current.delete(id);
      }
    }

    for (const p of prospects) {
      const existing = markersRef.current.get(p.place_id);
      const color = STATUS_BY_VALUE[p.status]?.color || "#94a3b8";
      const isSelected = p.place_id === selectedId;
      const html = `<div class="pin ${isSelected ? "selected" : ""}" style="background:${color}"></div>`;
      const icon = L.divIcon({
        html,
        className: "",
        iconSize: isSelected ? [28, 28] : [22, 22],
        iconAnchor: isSelected ? [14, 28] : [11, 22],
      });
      if (existing) {
        existing.setIcon(icon);
        existing.setLatLng([p.lat, p.lng]);
      } else {
        const m = L.marker([p.lat, p.lng], { icon });
        m.bindPopup(
          `<strong>${escapeHtml(p.name)}</strong>` +
          `<div class="muted">${escapeHtml(p.address)}</div>` +
          `<a href="tel:${escapeHtml(p.phone)}">📞 ${escapeHtml(p.phone)}</a>`
        );
        m.on("click", () => onSelect(p.place_id));
        m.addTo(map);
        markersRef.current.set(p.place_id, m);
      }
    }
  }, [prospects, selectedId, onSelect]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !selectedId) return;
    const p = prospects.find((x) => x.place_id === selectedId);
    if (!p) return;
    map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
    const m = markersRef.current.get(selectedId);
    if (m) m.openPopup();
  }, [selectedId, prospects]);

  return <div id="map" ref={mapRef} />;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function ProspectList({ items, selectedId, onSelect }) {
  // Solo renderizo los primeros 200 en la tabla para que el DOM no explote con 500 filas.
  // El mapa sigue mostrando todos.
  const MAX = 200;
  const visible = items.slice(0, MAX);
  return (
    <div className="list-wrap">
      <table className="prospect-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Rubro</th>
            <th>Teléfono</th>
            <th>Zona</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((p) => {
            const status = STATUS_BY_VALUE[p.status];
            return (
              <tr
                key={p.place_id}
                className={selectedId === p.place_id ? "selected" : ""}
                onClick={() => onSelect(p)}
              >
                <td>{p.name}</td>
                <td>{p.type}</td>
                <td>{p.phone}</td>
                <td>{p.zones.join(", ")}</td>
                <td>
                  <span className="badge" style={{ background: status?.color }}>
                    {status?.label}
                  </span>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr><td colSpan="5" className="empty">Sin resultados con esos filtros.</td></tr>
          )}
          {items.length > MAX && (
            <tr><td colSpan="5" className="empty">
              Mostrando primeros {MAX} de {items.length}. Refiná los filtros para ver el resto.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DetailPanel({ prospect, onUpdate, onClose }) {
  const [notes, setNotes] = useState("");
  const lastIdRef = useRef(null);

  useEffect(() => {
    if (prospect && prospect.place_id !== lastIdRef.current) {
      setNotes(prospect.notes || "");
      lastIdRef.current = prospect.place_id;
    }
  }, [prospect]);

  if (!prospect) {
    return (
      <aside className="detail empty-detail">
        Seleccioná un prospecto en el mapa o la lista.
      </aside>
    );
  }

  return (
    <aside className="detail">
      <button className="close" onClick={onClose}>×</button>
      <h2>{prospect.name}</h2>
      <p className="muted">{prospect.address}</p>
      <p className="muted">{prospect.type}</p>

      <div className="actions">
        <a className="btn primary" href={`tel:${prospect.phone}`}>📞 {prospect.phone}</a>
        {prospect.google_maps && (
          <a className="btn" href={prospect.google_maps} target="_blank" rel="noreferrer">
            Ver en Maps
          </a>
        )}
      </div>

      <label>
        Estado
        <select
          value={prospect.status}
          onChange={(e) => onUpdate(prospect.place_id, { status: e.target.value, notes: prospect.notes })}
        >
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>

      <label>
        Notas
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          placeholder="Notas de la conversación, horarios, contacto, etc."
        />
        <button
          className="btn"
          onClick={() => onUpdate(prospect.place_id, { status: prospect.status, notes })}
          disabled={notes === (prospect.notes || "")}
        >
          Guardar notas
        </button>
      </label>

      <div className="meta">
        <small>Zonas: {prospect.zones.join(" | ")}</small>
        {prospect.updated_at && <small>Actualizado: {new Date(prospect.updated_at).toLocaleString()}</small>}
      </div>
    </aside>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
