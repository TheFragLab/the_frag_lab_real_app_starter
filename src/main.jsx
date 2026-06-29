import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Beaker, BookOpen, FlaskConical, Search, Sparkles, Crown, Droplets, Heart, ClipboardList, Database } from 'lucide-react';
import { specimensData } from './data/specimensData.js';
import './styles.css';

const STORAGE_KEY = 'the-frag-lab-alpha-state-v3-phase1-import';

const starterExperiment = {
  id: 'exp-country-girl-velvet-rose',
  title: 'Country Girl + Velvet Rose',
  status: 'Active',
  hypothesis: 'Country Girl may enhance Velvet Rose by supporting the creamy sweet floral facets of the Donna Born in Roma DNA.',
  purpose: 'Test compatibility and determine whether Country Girl acts as support or competes.',
  formula: [],
  observations: { opening: '', heart: '', drydown: '', unexpected: '', final: '' },
  rating: '',
  result: 'Under Testing',
  createdAt: new Date().toISOString()
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch {}
  return {
    specimens: specimensData,
    experiments: [starterExperiment],
    bench: { base: '', oil: 'specimen-0001-lychee-dream', primary: '', secondary: '', accent: '' },
    ideas: [{ id: 'idea-1', text: 'Does Country Girl play nicely with Velvet Rose / Donna Born in Roma DNA?', status: 'Testing' }],
    selectedId: 'specimen-0001-lychee-dream'
  };
}

function Chip({ children, tone = '' }) {
  if (!children) return null;
  return <span className={`chip ${tone}`}>{children}</span>;
}
function Field({ label, value }) {
  return <div className="field"><div className="label">{label}</div><div className="value">{value || '—'}</div></div>;
}
function NoteList({ title, items }) {
  return <div className="noteBox"><div className="label">{title}</div><div className="noteList">{(items || []).length ? items.map(item => <span key={item}>{item}</span>) : <em>—</em>}</div></div>;
}

function App() {
  const [state, setState] = useState(loadState);
  const [screen, setScreen] = useState('specimen');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [reviewFilter, setReviewFilter] = useState('All');

  const update = (next) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const specimensById = useMemo(() => Object.fromEntries(state.specimens.map(s => [s.id, s])), [state.specimens]);
  const selected = specimensById[state.selectedId] || state.specimens[0];

  const stats = useMemo(() => {
    const total = state.specimens.length;
    const body = state.specimens.filter(s => s.category === 'Body Care').length;
    const oil = state.specimens.filter(s => s.category === 'Oil').length;
    const perfume = state.specimens.filter(s => s.category === 'Perfume').length;
    const needsReview = state.specimens.filter(s => s.reviewStatus === 'Needs Review').length;
    return { total, body, oil, perfume, needsReview };
  }, [state.specimens]);

  const filtered = state.specimens.filter(s => {
    const blob = [s.specimenNumber, s.name, s.brand, s.type, s.category, s.family, s.role, s.status, s.notes, s.inspiredBy, s.dna, s.reviewStatus].join(' ').toLowerCase();
    const qMatch = blob.includes(query.toLowerCase());
    const catMatch = categoryFilter === 'All' || s.category === categoryFilter;
    const reviewMatch = reviewFilter === 'All' || s.reviewStatus === reviewFilter;
    return qMatch && catMatch && reviewMatch;
  });

  const selectSpecimen = (id) => {
    update({ ...state, selectedId: id });
    setScreen('specimen');
  };

  const setBench = (slot, id) => update({ ...state, bench: { ...state.bench, [slot]: id } });
  const benchOptions = (slot) => {
    if (slot === 'base') return state.specimens.filter(s => s.category === 'Body Care');
    if (slot === 'oil') return state.specimens.filter(s => s.category === 'Oil');
    return state.specimens.filter(s => s.category !== 'Body Care' || slot === 'accent');
  };

  const mixBench = () => {
    const formula = Object.values(state.bench).filter(Boolean);
    if (!formula.length) return;
    const names = formula.map(id => specimensById[id]?.name).filter(Boolean);
    const exp = {
      id: 'exp-' + Date.now(),
      title: names.join(' + '),
      status: 'Active',
      hypothesis: '',
      purpose: '',
      formula,
      observations: { opening: '', heart: '', drydown: '', unexpected: '', final: '' },
      rating: '',
      result: 'Under Testing',
      createdAt: new Date().toISOString()
    };
    update({ ...state, experiments: [exp, ...state.experiments] });
    setScreen('reports');
  };

  const updateExperiment = (id, patch) => update({ ...state, experiments: state.experiments.map(e => e.id === id ? { ...e, ...patch } : e) });
  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'the-frag-lab-backup.json';
    a.click();
  };

  return (
    <div className="app">
      <header>
        <div className="brandRow"><div className="logo"><FlaskConical size={26}/></div><div><h1>The Frag Lab</h1><p>Explore the DNA. Preserve the Royals.</p></div></div>
        <blockquote>The Canon isn't someone else's opinion. It's your proven knowledge.</blockquote>
      </header>

      <main>
        {screen === 'specimen' && selected && (
          <section>
            <div className="specimenHero">
              <div className="specimenBottle"><Droplets size={44}/><span>{selected.category}</span></div>
              <div className="specimenTitle">
                <p className="eyebrow">{selected.tribute ? 'Tribute Specimen' : 'Specimen'} #{selected.specimenNumber}</p>
                <h2>{selected.name}</h2><p>{selected.brand} · {selected.type}</p>
                <div><Chip tone="gold">{selected.royalStatus || selected.role}</Chip><Chip>{selected.inventoryStatus}</Chip><Chip>{selected.reviewStatus}</Chip><Chip>{selected.labConfidence}</Chip></div>
              </div>
            </div>
            <div className="specimenGrid"><Field label="Category" value={selected.category}/><Field label="Size" value={selected.size}/><Field label="Concentration" value={selected.concentration}/><Field label="DNA Family" value={selected.family}/><Field label="Inspired By" value={selected.inspiredBy}/><Field label="Replacement" value={selected.replacementStatus}/></div>
            {selected.bottleLevel !== '' && <><div className="label meterLabel">Bottle Level: {selected.bottleLevel}%</div><div className="meter"><div style={{ width: `${selected.bottleLevel || 0}%` }} /></div></>}
            <div className="panel"><h3><Crown/> Lab Classification</h3><div className="specimenGrid"><Field label="Role" value={selected.role}/><Field label="Status" value={selected.status}/><Field label="Confidence" value={selected.labConfidence}/><Field label="Verdict" value={selected.verdict}/></div></div>
            <div className="panel"><h3><Sparkles/> DNA + Notes</h3><Field label="DNA" value={selected.dna}/><div className="notesColumns"><NoteList title="Top" items={selected.topNotes}/><NoteList title="Heart" items={selected.heartNotes}/><NoteList title="Base" items={selected.baseNotes}/></div><NoteList title="Accords" items={selected.accords}/></div>
            <div className="panel"><h3><Heart/> Relationships</h3><NoteList title="Pairs With" items={selected.pairsWith}/><NoteList title="Canon Links" items={selected.canonLinks}/><NoteList title="Experiments" items={selected.experiments}/></div>
            <div className="panel"><h3><ClipboardList/> Lead Scientist Notes</h3><p>{selected.notes || '—'}</p><p className="scientistNote">{selected.scientistNotes || ''}</p></div>
          </section>
        )}

        {screen === 'bench' && (
          <section><h2><Beaker/> The Bench</h2><p className="muted">Build a formula, then mix it into a Lab Report. Slots now filter by specimen category.</p>{[['base','Body Care / Base'],['oil','Oil'],['primary','Primary'],['secondary','Secondary / Accent'],['accent','Extra Accent']].map(([slot,label]) => <div className="slot" key={slot}><h3>{label}</h3><select value={state.bench[slot] || ''} onChange={e => setBench(slot, e.target.value)}><option value="">Choose specimen...</option>{benchOptions(slot).map(s => <option key={s.id} value={s.id}>#{s.specimenNumber} {s.name} — {s.brand}</option>)}</select>{state.bench[slot] && <div className="slotPreview">{specimensById[state.bench[slot]]?.family}</div>}</div>)}<button className="mix" onClick={mixBench}>🧪 MIX</button></section>
        )}

        {screen === 'canon' && (
          <section><h2><Database/> Specimen Database</h2><div className="stats"><div><b>{stats.total}</b><span>Total</span></div><div><b>{stats.body}</b><span>Body Care</span></div><div><b>{stats.oil}</b><span>Oils</span></div><div><b>{stats.perfume}</b><span>Perfumes</span></div><div><b>{stats.needsReview}</b><span>Needs Review</span></div></div><div className="search"><Search size={18}/><input placeholder="Search specimens..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="filterRow"><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option>All</option><option>Body Care</option><option>Oil</option><option>Perfume</option></select><select value={reviewFilter} onChange={e=>setReviewFilter(e.target.value)}><option>All</option><option>Needs Review</option><option>Verified</option></select></div><div className="grid">{filtered.map(s => <article className="card" key={s.id} onClick={() => selectSpecimen(s.id)}><p className="eyebrow">#{s.specimenNumber} · {s.category}</p><h3>{s.name}</h3><p>{s.brand} · {s.type}</p><Chip>{s.role}</Chip><Chip>{s.family}</Chip><Chip>{s.reviewStatus}</Chip></article>)}</div></section>
        )}

        {screen === 'reports' && (
          <section><h2><Sparkles/> Lab Reports</h2>{state.experiments.map(e => <article className="report" key={e.id}><h3>{e.title}</h3><Chip>{e.status}</Chip><Chip>{e.result}</Chip><div className="formula">{e.formula.map(id => <span key={id}>{specimensById[id]?.name || id}</span>)}</div><label>Hypothesis</label><textarea value={e.hypothesis} onChange={ev => updateExperiment(e.id,{hypothesis:ev.target.value})}/><label>Purpose</label><textarea value={e.purpose} onChange={ev => updateExperiment(e.id,{purpose:ev.target.value})}/>{Object.keys(e.observations).map(k => <React.Fragment key={k}><label>{k[0].toUpperCase()+k.slice(1)} Observation</label><textarea value={e.observations[k]} onChange={ev => updateExperiment(e.id,{observations:{...e.observations,[k]:ev.target.value}})}/></React.Fragment>)}<label>Rating / Result</label><input value={e.rating} placeholder="🔥🔥🔥🔥🔥" onChange={ev => updateExperiment(e.id,{rating:ev.target.value})}/><select value={e.result} onChange={ev => updateExperiment(e.id,{result:ev.target.value})}><option>Under Testing</option><option>Repeat Worthy</option><option>Canon Certified</option><option>Failed Experiment</option></select></article>)}</section>
        )}
        {screen === 'ideas' && <section><h2>💡 I Wonder...</h2>{state.ideas.map(i => <article className="card" key={i.id}><h3>{i.text}</h3><Chip>{i.status}</Chip></article>)}</section>}
        <button className="secondary" onClick={exportData}>Export Backup</button>
      </main>
      <nav><button className={screen==='specimen'?'active':''} onClick={()=>setScreen('specimen')}>Specimen</button><button className={screen==='bench'?'active':''} onClick={()=>setScreen('bench')}>Bench</button><button className={screen==='canon'?'active':''} onClick={()=>setScreen('canon')}>Database</button><button className={screen==='reports'?'active':''} onClick={()=>setScreen('reports')}>Reports</button><button className={screen==='ideas'?'active':''} onClick={()=>setScreen('ideas')}>Wonder</button></nav>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
