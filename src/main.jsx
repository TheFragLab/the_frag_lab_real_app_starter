import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Beaker,
  BookOpen,
  ClipboardList,
  Database,
  Droplets,
  Edit3,
  FlaskConical,
  Heart,
  Save,
  Search,
  Sparkles,
  X
} from 'lucide-react';
import {specimensData} from './data/specimensData';
import './styles.css';

const STORAGE_KEY = 'the-frag-lab-alpha-state-v3-edit-mode';

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.specimens?.length) return saved;
  } catch {}
  return {
    specimens: specimensData,
    selectedId: specimensData[0]?.id || '',
    screen: 'specimens',
    bench: { bodyCare: '', oil: '', fragrance1: '', fragrance2: '', fragrance3: '' },
    reports: []
  };
}

function specimenNumber(specimen) {
  return specimen.specimenNumber || specimen.number || '0000';
}

function isTribute(specimen) {
  return Boolean(specimen.tribute || specimen.isTribute || specimen.royalStatus?.toLowerCase?.().includes('tribute'));
}

function categoryOf(specimen) {
  return specimen.category || specimen.type || 'Specimen';
}

function labelFor(specimen) {
  if (isTribute(specimen)) return `Tribute Specimen #${specimenNumber(specimen)}`;
  return `#${specimenNumber(specimen)} · ${categoryOf(specimen)}`;
}

function makeSearchBlob(specimen) {
  return [
    specimen.name,
    specimen.brand,
    specimen.house,
    specimen.maker,
    specimen.category,
    specimen.type,
    specimen.role,
    specimen.family,
    specimen.dna,
    specimen.status,
    specimen.reviewStatus,
    specimen.notes,
    specimen.scientistNotes,
    specimen.inspiredBy
  ].filter(Boolean).join(' ').toLowerCase();
}

function Chip({ children, tone = '' }) {
  if (!children) return null;
  return <span className={`chip ${tone}`}>{children}</span>;
}

function Field({ label, value }) {
  return (
    <div className="field">
      <div className="label">{label}</div>
      <div className="value">{value || '—'}</div>
    </div>
  );
}

function EditableField({ label, value, onChange, multiline = false }) {
  return (
    <label className="editField">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value || ''} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function SpecimenCard({ specimen, selected, onClick }) {
  return (
    <article className={`specimenCard ${selected ? 'selected' : ''}`} onClick={onClick}>
      <p className="specimenNumber">{labelFor(specimen)}</p>
      <h3>{specimen.name}</h3>
      <p>{specimen.brand || specimen.house || specimen.maker || 'Unknown'} · {categoryOf(specimen)}</p>
      <div>
        <Chip tone={isTribute(specimen) ? 'gold' : ''}>{specimen.role || specimen.reviewStatus || 'Needs Review'}</Chip>
        <Chip>{specimen.family || specimen.dna}</Chip>
        <Chip>{specimen.status || specimen.reviewStatus || 'Needs Review'}</Chip>
      </div>
    </article>
  );
}

function SpecimenPage({ specimen, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(specimen);

  React.useEffect(() => {
    setDraft(specimen);
    setEditing(false);
  }, [specimen?.id]);

  if (!specimen) return null;

  const updateDraft = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }));

  const saveDraft = () => {
    onSave(draft);
    setEditing(false);
  };

  const cancelDraft = () => {
    setDraft(specimen);
    setEditing(false);
  };

  const shown = editing ? draft : specimen;

  return (
    <section className="specimenPage">
      <div className="specimenHero">
        <div className="specimenBottle">
          <Droplets size={46} />
          <span>{categoryOf(shown)}</span>
        </div>

        <div className="specimenTitle">
          <p className="eyebrow">{labelFor(shown)}</p>
          {editing ? (
            <>
              <EditableField label="Name" value={draft.name} onChange={(value) => updateDraft('name', value)} />
              <EditableField label="Brand / House" value={draft.brand || draft.house || draft.maker} onChange={(value) => updateDraft('brand', value)} />
            </>
          ) : (
            <>
              <h2>{shown.name}</h2>
              <p>{shown.brand || shown.house || shown.maker || 'Unknown'} · {categoryOf(shown)}</p>
            </>
          )}

          <div className="buttonRow">
            {editing ? (
              <>
                <button className="smallButton" onClick={saveDraft}><Save size={16} /> Save</button>
                <button className="smallButton quiet" onClick={cancelDraft}><X size={16} /> Cancel</button>
              </>
            ) : (
              <button className="smallButton" onClick={() => setEditing(true)}><Edit3 size={16} /> Edit</button>
            )}
          </div>

          <div>
            <Chip tone={isTribute(shown) ? 'gold' : ''}>{isTribute(shown) ? 'Tribute Specimen' : shown.role}</Chip>
            <Chip>{shown.status || shown.reviewStatus}</Chip>
            <Chip>{shown.category}</Chip>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="panel">
          <h3><Edit3 /> Edit Specimen</h3>
          <div className="editGrid">
            <EditableField label="Category" value={draft.category} onChange={(value) => updateDraft('category', value)} />
            <EditableField label="Type" value={draft.type} onChange={(value) => updateDraft('type', value)} />
            <EditableField label="Role" value={draft.role} onChange={(value) => updateDraft('role', value)} />
            <EditableField label="Status" value={draft.status || draft.reviewStatus} onChange={(value) => updateDraft('status', value)} />
            <EditableField label="Family / DNA" value={draft.family || draft.dna} onChange={(value) => updateDraft('family', value)} />
            <EditableField label="Inspired By" value={draft.inspiredBy} onChange={(value) => updateDraft('inspiredBy', value)} />
            <EditableField label="Scientist Notes" value={draft.scientistNotes || draft.notes} multiline onChange={(value) => updateDraft('scientistNotes', value)} />
            <EditableField label="Private Notes" value={draft.notes} multiline onChange={(value) => updateDraft('notes', value)} />
          </div>
        </div>
      ) : (
        <>
          <div className="specimenGrid">
            <Field label="Category" value={shown.category} />
            <Field label="Type" value={shown.type} />
            <Field label="Role" value={shown.role} />
            <Field label="Status" value={shown.status || shown.reviewStatus} />
            <Field label="Family / DNA" value={shown.family || shown.dna} />
            <Field label="Inspired By" value={shown.inspiredBy} />
          </div>

          <div className="panel">
            <h3><ClipboardList /> Lead Scientist Notes</h3>
            <p>{shown.scientistNotes || shown.notes || 'No scientist notes yet.'}</p>
          </div>

          <div className="panel">
            <h3><Heart /> Lab Notes</h3>
            <p>{shown.notes || 'No notes yet.'}</p>
          </div>
        </>
      )}
    </section>
  );
}

function App() {
  const [state, setState] = useState(loadState);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const updateState = (next) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const selectedSpecimen = state.specimens.find((specimen) => specimen.id === state.selectedId) || state.specimens[0];

  const counts = useMemo(() => {
    const total = state.specimens.length;
    const bodyCare = state.specimens.filter((s) => categoryOf(s).toLowerCase().includes('body')).length;
    const oils = state.specimens.filter((s) => categoryOf(s).toLowerCase().includes('oil')).length;
    const perfumes = state.specimens.filter((s) => categoryOf(s).toLowerCase().includes('perfume')).length;
    const needsReview = state.specimens.filter((s) => (s.status || s.reviewStatus || '').toLowerCase().includes('review')).length;
    return { total, bodyCare, oils, perfumes, needsReview };
  }, [state.specimens]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(state.specimens.map(categoryOf))).filter(Boolean).sort()], [state.specimens]);
  const statuses = useMemo(() => ['All', ...Array.from(new Set(state.specimens.map((s) => s.status || s.reviewStatus).filter(Boolean))).sort()], [state.specimens]);

  const filteredSpecimens = state.specimens.filter((specimen) => {
    const matchesQuery = makeSearchBlob(specimen).includes(query.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || categoryOf(specimen) === categoryFilter;
    const specimenStatus = specimen.status || specimen.reviewStatus || '';
    const matchesStatus = statusFilter === 'All' || specimenStatus === statusFilter;
    return matchesQuery && matchesCategory && matchesStatus;
  });

  const saveSpecimen = (updatedSpecimen) => {
    const nextSpecimens = state.specimens.map((specimen) => specimen.id === updatedSpecimen.id ? updatedSpecimen : specimen);
    updateState({ ...state, specimens: nextSpecimens });
  };

  const setScreen = (screen) => updateState({ ...state, screen });

  const chooseSpecimen = (specimen) => updateState({ ...state, selectedId: specimen.id, screen: 'specimen' });

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'the-frag-lab-editable-backup.json';
    anchor.click();
  };

  return (
    <div className="app">
      <header>
        <div className="brandRow">
          <div className="logo"><FlaskConical size={26} /></div>
          <div>
            <h1>The Frag Lab</h1>
            <p>Explore the DNA. Preserve the Royals.</p>
          </div>
        </div>
        <blockquote>The Canon isn't someone else's opinion. It's your proven knowledge.</blockquote>
      </header>

      <main>
        {state.screen === 'specimens' && (
          <section>
            <h2><Database /> Specimen Database</h2>

            <div className="stats">
              <div><strong>{counts.total}</strong><span>Total</span></div>
              <div><strong>{counts.bodyCare}</strong><span>Body Care</span></div>
              <div><strong>{counts.oils}</strong><span>Oils</span></div>
              <div><strong>{counts.perfumes}</strong><span>Perfumes</span></div>
              <div><strong>{counts.needsReview}</strong><span>Needs Review</span></div>
            </div>

            <div className="search">
              <Search size={18} />
              <input value={query} placeholder="Search specimens..." onChange={(event) => setQuery(event.target.value)} />
            </div>

            <div className="filterRow">
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>

            <div className="grid">
              {filteredSpecimens.slice(0, 200).map((specimen) => (
                <SpecimenCard
                  key={specimen.id}
                  specimen={specimen}
                  selected={specimen.id === state.selectedId}
                  onClick={() => chooseSpecimen(specimen)}
                />
              ))}
            </div>

            {filteredSpecimens.length > 200 && (
              <p className="muted">Showing first 200 results. Search or filter to narrow the database.</p>
            )}
          </section>
        )}

        {state.screen === 'specimen' && (
          <SpecimenPage specimen={selectedSpecimen} onSave={saveSpecimen} />
        )}

        {state.screen === 'bench' && (
          <section>
            <h2><Beaker /> Bench</h2>
            <p>The Bench is ready for Phase 3. Specimens are loaded and editable first.</p>
          </section>
        )}

        {state.screen === 'canon' && (
          <section>
            <h2><BookOpen /> Canon</h2>
            <p>Canon formulas will link to editable specimens in the next build.</p>
          </section>
        )}

        {state.screen === 'reports' && (
          <section>
            <h2><Sparkles /> Reports</h2>
            <p>Reports will analyze specimen roles, categories, review status, and Canon wins.</p>
          </section>
        )}

        {state.screen === 'wonder' && (
          <section>
            <h2>💡 I Wonder...</h2>
            <p>Future hypotheses and layering ideas will live here.</p>
          </section>
        )}

        <button className="secondary" onClick={exportBackup}>Export Backup</button>
      </main>

      <nav>
        <button className={state.screen === 'specimens' ? 'active' : ''} onClick={() => setScreen('specimens')}>Specimens</button>
        <button className={state.screen === 'bench' ? 'active' : ''} onClick={() => setScreen('bench')}>Bench</button>
        <button className={state.screen === 'canon' ? 'active' : ''} onClick={() => setScreen('canon')}>Canon</button>
        <button className={state.screen === 'reports' ? 'active' : ''} onClick={() => setScreen('reports')}>Reports</button>
        <button className={state.screen === 'wonder' ? 'active' : ''} onClick={() => setScreen('wonder')}>Wonder</button>
      </nav>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
